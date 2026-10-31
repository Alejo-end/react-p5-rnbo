import SketchWrapper from 'components/SketchWrapper'
import { NextPage } from 'next'
import { useState, useEffect, useRef } from 'react'
import { Text, Box, Button, HStack } from '@chakra-ui/react'
import { ColorValue, Draw, P5, Setup } from 'types/CustomP5'
import { createDevice, Device, IPatcher, MIDIEvent, TimeNow } from '@rnbo/js'
import { Play } from 'lucide-react'

// One octave from middle C. Each black key sits on the right edge of the
// white key it is listed under.
const whiteNotes = [60, 62, 64, 65, 67, 69, 71]
const blackKeys = [
    { after: 0, note: 61 },
    { after: 1, note: 63 },
    { after: 3, note: 66 },
    { after: 4, note: 68 },
    { after: 5, note: 70 },
]
const keyWidth = 60
const keyHeight = 220
const blackWidth = keyWidth * 0.6
const blackHeight = keyHeight * 0.6
const blackX = (after: number) => (after + 1) * keyWidth - blackWidth / 2

// The patch has no inports: notes go in as MIDI on port 0.
const noteOn = (note: number, velocity: number) => new MIDIEvent(TimeNow, 0, [0x90, note, velocity])
const noteOff = (note: number) => new MIDIEvent(TimeNow, 0, [0x80, note, 0])

const PianoSketch: NextPage = () => {
    // Canvas dimensions and styling
    const width: number = whiteNotes.length * keyWidth
    const height: number = keyHeight
    const dimensions: number[] = [width, height]
    const padding: number[] = [40]
    const background: ColorValue = [200]
    const volume = 0.8

    // Audio context and device refs
    const audioContextRef = useRef<AudioContext | null>(null)
    const deviceRef = useRef<Device | null>(null)
    const gainNodeRef = useRef<GainNode | null>(null)
    const midiAccessRef = useRef<MIDIAccess | null>(null)
    // The note the mouse is holding down, released on mouse up.
    const mouseNoteRef = useRef<number | null>(null)

    // State for audio settings and loading
    const [isLoading, setIsLoading] = useState(false)
    const [isAudioInitialized, setIsAudioInitialized] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Notes sounding now, from the mouse or a MIDI keyboard
    const [pressedNotes, setPressedNotes] = useState<number[]>([])

    const handleNoteOn = (note: number, velocity: number) => {
        if (!deviceRef.current) return
        deviceRef.current.scheduleEvent(noteOn(note, velocity))
        setPressedNotes(prev => (prev.includes(note) ? prev : [...prev, note]))
    }

    const handleNoteOff = (note: number) => {
        if (!deviceRef.current) return
        deviceRef.current.scheduleEvent(noteOff(note))
        setPressedNotes(prev => prev.filter(n => n !== note))
    }

    // Initialize audio context and RNBO device
    const initAudio = async () => {
        try {
            setIsLoading(true)
            setError(null)
            if (typeof window !== 'undefined' && !audioContextRef.current) {
                const AudioContext = window.AudioContext
                audioContextRef.current = new AudioContext()
                gainNodeRef.current = audioContextRef.current.createGain()
                gainNodeRef.current.gain.value = volume
                gainNodeRef.current.connect(audioContextRef.current.destination)
                await loadRNBO(audioContextRef.current)
                setIsAudioInitialized(true)
                setupMIDI()
            } else if (audioContextRef.current?.state === 'suspended') {
                await audioContextRef.current.resume()
                setIsAudioInitialized(true)
            }
            setIsLoading(false)
        } catch (err) {
            console.error('Audio initialization failed:', err)
            // Let the next click start over.
            audioContextRef.current?.close()
            audioContextRef.current = null
            setError('Audio did not start. Click "Start Audio" to try again.')
            setIsLoading(false)
        }
    }

    // Load RNBO patch
    const loadRNBO = async (audioContext: AudioContext) => {
        await audioContext.resume()
        const rawPatcher = await fetch('/patches/piano.json')
        if (!rawPatcher.ok) {
            throw new Error('Failed to load piano patch')
        }
        const patcher: IPatcher = await rawPatcher.json()
        const device = await createDevice({ context: audioContext, patcher })
        // Every envelope parameter starts at 0, which is silent. The
        // exported preset holds the sound the patch was made with.
        const preset = patcher.presets?.[0]?.preset
        if (preset) device.setPreset(preset)
        deviceRef.current = device
        device.node.connect(gainNodeRef.current!)
    }

    // A MIDI keyboard plays the same notes. Asked only after audio starts,
    // so the permission prompt follows a click.
    const setupMIDI = async () => {
        if (!navigator.requestMIDIAccess) return
        try {
            const midiAccess = await navigator.requestMIDIAccess()
            midiAccessRef.current = midiAccess
            midiAccess.inputs.forEach(input => {
                input.onmidimessage = handleMIDIMessage
            })
        } catch (err) {
            console.error('MIDI setup failed:', err)
            setError('No MIDI access. You can still click the keys.')
        }
    }

    const handleMIDIMessage = (message: MIDIMessageEvent) => {
        if (!message.data) return
        const data = message.data
        const status = data[0], note = data[1], velocity = data[2]
        const command = status & 0xf0
        if (command === 0x90 && velocity > 0) {
            handleNoteOn(note, velocity)
        } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
            handleNoteOff(note)
        }
    }

    useEffect(() => {
        return () => {
            midiAccessRef.current?.inputs.forEach(input => {
                input.onmidimessage = null
            })
            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
        }
    }, [])

    const setup: Setup = p5 => {
        p5.textAlign(p5.CENTER, p5.CENTER)
    }

    // On a narrow window the canvas shrinks to fit; the keys shrink with it.
    const scaleOf = (p5: P5) => p5.width / width

    const draw: Draw = p5 => {
        p5.background(background[0])
        p5.scale(scaleOf(p5))

        // Draw white keys
        p5.strokeWeight(1)
        p5.stroke(100)
        whiteNotes.forEach((note, i) => {
            if (pressedNotes.includes(note)) {
                p5.fill(255, 255, 150)
            } else {
                p5.fill(255)
            }
            p5.rect(i * keyWidth, 0, keyWidth, keyHeight)
        })

        // Draw black keys
        blackKeys.forEach(({ after, note }) => {
            if (pressedNotes.includes(note)) {
                p5.fill(110, 110, 40)
            } else {
                p5.fill(0)
            }
            p5.rect(blackX(after), 0, blackWidth, blackHeight)
        })
    }

    // Black keys lie on top, so they win where they overlap a white key.
    const noteAt = (x: number, y: number): number | null => {
        if (x < 0 || x >= width || y < 0 || y >= height) return null
        if (y < blackHeight) {
            const black = blackKeys.find(({ after }) => x >= blackX(after) && x < blackX(after) + blackWidth)
            if (black) return black.note
        }
        return whiteNotes[Math.floor(x / keyWidth)]
    }

    const mousePressed = (p5: P5) => {
        if (!isAudioInitialized) return

        const note = noteAt(p5.mouseX / scaleOf(p5), p5.mouseY / scaleOf(p5))
        if (note !== null) {
            mouseNoteRef.current = note
            handleNoteOn(note, 100)
        }
    }

    const mouseReleased = () => {
        if (mouseNoteRef.current !== null) {
            handleNoteOff(mouseNoteRef.current)
            mouseNoteRef.current = null
        }
    }

    return (
        <Box className="relative">
            <HStack
                position="absolute"
                top={20}
                left="50%"
                transform="translateX(-50%)"
                spacing={2}
                bg="blackAlpha.500"
                p={2}
                borderRadius="md"
                zIndex={1}
            >
                <Button
                    onClick={initAudio}
                    colorScheme="blue"
                    size="sm"
                    variant="ghost"
                    isLoading={isLoading}
                    disabled={isAudioInitialized}
                >
                    <Play />
                    <Text ml={2}>{isAudioInitialized ? 'Audio Running' : 'Start Audio'}</Text>
                </Button>
            </HStack>

            <div className="cursor-pointer">
                <SketchWrapper
                    setup={setup}
                    draw={draw}
                    dimensions={dimensions}
                    padding={padding}
                    background={background}
                    mousePressed={mousePressed}
                    mouseReleased={mouseReleased}
                />

                <Text
                    position="absolute"
                    bottom={20}
                    left="50%"
                    transform="translateX(-50%)"
                    fontSize="12px"
                    userSelect="none"
                >
                    {error ??
                        (isAudioInitialized
                            ? 'MIDI Piano, connect your MIDI keyboard. Click to play notes.'
                            : 'Click "Start Audio" to begin')}
                </Text>
            </div>
        </Box>
    )
}

export default PianoSketch
