import SketchWrapper from 'components/SketchWrapper'
import { NextPage } from 'next'
import { useState, useEffect, useRef } from 'react'
import { Text, Box, Button, HStack } from '@chakra-ui/react'
import { ColorValue, Draw, Setup } from 'types/CustomP5'
import { createDevice, Device, TimeNow, MessageEvent } from '@rnbo/js'
import { Play } from 'lucide-react'

const PianoSketch: NextPage = () => {
    // Canvas dimensions and styling
    const width: number = 4 * 60
    const height: number = 220
    const dimensions: number[] = [width, height]
    const padding: number[] = [40]
    const background: ColorValue = [200]

    // Audio context and device refs
    const audioContextRef = useRef<AudioContext | null>(null)
    const deviceRef = useRef<Device | null>(null)
    const gainNodeRef = useRef<GainNode | null>(null)

    // State for audio settings and loading
    const [volume, setVolume] = useState<number>(0.8)
    const [isLoading, setIsLoading] = useState(false)
    const [isAudioInitialized, setIsAudioInitialized] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Starting MIDI note number for the first key (C4 = 60)
    const startNote = 60

    // State for tracking pressed keys
    const [pressedKeys, setPressedKeys] = useState<boolean[]>([false, false, false, false, false, false])

    // Initialize audio context and RNBO device
    const initAudio = async () => {
        try {
            setIsLoading(true)
            if (typeof window !== 'undefined' && !audioContextRef.current) {
                const AudioContext = window.AudioContext
                audioContextRef.current = new AudioContext()
                gainNodeRef.current = audioContextRef.current.createGain()
                gainNodeRef.current.gain.value = volume
                gainNodeRef.current.connect(audioContextRef.current.destination)
                await loadRNBO(audioContextRef.current)
                setIsAudioInitialized(true)
            } else if (audioContextRef.current?.state === 'suspended') {
                await audioContextRef.current.resume()
                setIsAudioInitialized(true)
            }
            setIsLoading(false)
        } catch (err) {
            console.error('Audio initialization failed:', err)
            setError('Failed to initialize audio. Please try again.')
            setIsLoading(false)
        }
    }

    // Load RNBO patch
    const loadRNBO = async (audioContext: AudioContext) => {
        try {
            await audioContext.resume()
            const rawPatcher = await fetch('/patches/piano.json')
            if (!rawPatcher.ok) {
                throw new Error('Failed to load piano patch')
            }
            const patcher = await rawPatcher.json()
            const device = await createDevice({ context: audioContext, patcher })
            deviceRef.current = device
            device.node.connect(gainNodeRef.current!)
        } catch (err) {
            console.error('RNBO loading failed:', err)
            throw new Error('Failed to load piano patch')
        }
    }

    // MIDI setup
    useEffect(() => {
        const setupMIDI = async () => {
            try {
                const midiAccess = await navigator.requestMIDIAccess()
                midiAccess.inputs.forEach(input => {
                    input.onmidimessage = handleMIDIMessage
                })
            } catch (err) {
                console.error('MIDI setup failed:', err)
                setError('MIDI setup failed. You can still use mouse clicks.')
            }
        }

        setupMIDI()

        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
        }
    }, [])

    const handleMIDIMessage = (message: any) => {
        if (!isAudioInitialized) return

        const [status, note, velocity] = message.data
        if (status === 144 && velocity > 0) {
            handleNoteOn(note, velocity)
        } else if (status === 128 || (status === 144 && velocity === 0)) {
            handleNoteOff(note)
        }
    }

    const handleNoteOn = (note: number, velocity: number) => {
        const keyIndex = note - startNote
        if (keyIndex >= 0 && keyIndex < pressedKeys.length) {
            const newPressedKeys = [...pressedKeys]
            newPressedKeys[keyIndex] = true
            setPressedKeys(newPressedKeys)

            if (deviceRef.current) {
                const noteOnEvent = new MessageEvent(TimeNow, "note", [note, velocity])
                deviceRef.current.scheduleEvent(noteOnEvent)
            }
        }
    }

    const handleNoteOff = (note: number) => {
        const keyIndex = note - startNote
        if (keyIndex >= 0 && keyIndex < pressedKeys.length) {
            const newPressedKeys = [...pressedKeys]
            newPressedKeys[keyIndex] = false
            setPressedKeys(newPressedKeys)

            if (deviceRef.current) {
                const noteOffEvent = new MessageEvent(TimeNow, "note", [note, 0])
                deviceRef.current.scheduleEvent(noteOffEvent)
            }
        }
    }

    const setup: Setup = p5 => {
        p5.textAlign(p5.CENTER, p5.CENTER)
    }

    const draw: Draw = p5 => {
        p5.background(background[0])

        const keyWidth = 60
        const keyHeight = 220
        const blackKeyOffset = 40
        const whiteKeys = [true, true, true, true, true, true]
        const blackKeys = [true, true, true]

        // Draw white keys
        p5.strokeWeight(1)
        p5.stroke(100)
        for (let i = 0; i < whiteKeys.length; i++) {
            if (pressedKeys[i]) {
                p5.fill(255, 255, 150)
            } else {
                p5.fill(255)
            }
            p5.rect(i * keyWidth, 0, keyWidth, keyHeight)
        }

        // Draw black keys
        p5.fill(0)
        for (let i = 0; i < blackKeys.length; i++) {
            if (blackKeys[i]) {
                p5.rect(i * keyWidth + blackKeyOffset, 0, keyWidth * 0.6, keyHeight * 0.6)
            }
        }
    }

    const mousePressed = (p5: any) => {
        if (!isAudioInitialized) return

        const keyWidth = 60
        for (let i = 0; i < pressedKeys.length; i++) {
            if (p5.mouseX > i * keyWidth && p5.mouseX < (i + 1) * keyWidth) {
                handleNoteOn(startNote + i, 100)
            }
        }
    }

    const mouseReleased = () => {
        if (!isAudioInitialized) return

        pressedKeys.forEach((isPressed, i) => {
            if (isPressed) {
                handleNoteOff(startNote + i)
            }
        })
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
                    {isAudioInitialized ?
                        'MIDI Piano, connect your MIDI keyboard. Click to play notes.' :
                        'Click "Start Audio" to begin'}
                </Text>
            </div>
        </Box>
    )
}

export default PianoSketch