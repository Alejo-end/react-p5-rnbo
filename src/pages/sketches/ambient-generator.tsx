import { NextPage } from 'next'
import { ColorValue, Draw, Setup } from 'types/CustomP5'
import { createDevice, TimeNow, MessageEvent, Device } from '@rnbo/js'
import { useRef, useState } from 'react'
import { Button, Box, HStack, Text } from '@chakra-ui/react'
import { Play, Volume2, VolumeX } from 'lucide-react'
import SketchWrapper from 'components/SketchWrapper'

interface KnobParameter {
    name: string;
    value: number;
    min: number;
    max: number;
    category: 'global' | 'pitch' | 'filter' | 'delay';
}

const Idm5r: NextPage = () => {
    const dimensions = [800, 400]
    const padding: number[] = [20]
    const background: ColorValue = [30]

    const audioContextRef = useRef<AudioContext | null>(null)
    const deviceRef = useRef<Device | null>(null)
    const gainNodeRef = useRef<GainNode | null>(null)

    // Add volume control states
    const [volume, setVolume] = useState<number>(0.8)
    const [isMuted, setIsMuted] = useState<boolean>(false)

    const [parameters, setParameters] = useState<KnobParameter[]>([
        { name: 'interval', value: 0.5, min: 0, max: 1, category: 'global' },
        { name: 'pitch_dupe', value: 0.5, min: 0, max: 1, category: 'pitch' },
        { name: 'transpose_dupe', value: 0.5, min: 0, max: 1, category: 'pitch' },
        { name: 'filter_dupe', value: 0.5, min: 0, max: 1, category: 'filter' },
        { name: 'filter_divider', value: 0.5, min: 0, max: 1, category: 'filter' },
        { name: 'regen', value: 0.5, min: 0, max: 1, category: 'delay' },
        { name: 'mix', value: 0.45, min: 0, max: 1, category: 'delay' }
    ])

    const [activeKnob, setActiveKnob] = useState<number | null>(null)
    const [lastY, setLastY] = useState<number>(0)

    const initAudio = async () => {
        if (typeof window !== 'undefined' && !audioContextRef.current) {
            const AudioContext = window.AudioContext
            audioContextRef.current = new AudioContext()

            // Create gain node for volume control
            gainNodeRef.current = audioContextRef.current.createGain()
            gainNodeRef.current.gain.value = volume
            gainNodeRef.current.connect(audioContextRef.current.destination)

            await loadRNBO(audioContextRef.current)
        }
    }

    const loadRNBO = async (audioContext: AudioContext) => {
        await audioContext.resume()

        const rawPatcher = await fetch('/patches/idm5r.json')
        const patcher = await rawPatcher.json()

        const device = await createDevice({ context: audioContext, patcher })
        deviceRef.current = device

        // Connect device to gain node instead of destination
        device.node.connect(gainNodeRef.current!)

        parameters.forEach((param, index) => {
            const rnboParam = device.parametersById.get(param.name)
            if (rnboParam) {
                updateParameter(index, rnboParam.normalizedValue)
            }
        })
    }

    const updateParameter = (index: number, value: number) => {
        setParameters(prev => {
            const newParams = [...prev]
            newParams[index] = { ...newParams[index], value }

            if (deviceRef.current) {
                const param = deviceRef.current.parametersById.get(newParams[index].name)
                if (param) {
                    param.normalizedValue = value
                }
            }

            return newParams
        })
    }

    const toggleMute = () => {
        setIsMuted(!isMuted)
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = !isMuted ? 0 : volume
        }
    }

    const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(event.target.value)
        setVolume(newVolume)
        if (gainNodeRef.current && !isMuted) {
            gainNodeRef.current.gain.value = newVolume
        }
    }

    const triggerRun = () => {
        if (deviceRef.current) {
            const event = new MessageEvent(TimeNow, "run", [1]);
            deviceRef.current.scheduleEvent(event);
        } else {
            console.error('Device not initialized.')
        }
    }

    const setup: Setup = (p5) => {
        initAudio()
        p5.textAlign(p5.CENTER, p5.CENTER)
    }

    const draw: Draw = (p5) => {
        p5.background(30)

        // Draw control panel at the top
        p5.fill(50)
        p5.noStroke()
        p5.rect(0, 0, p5.width, 60)

        const categories = ['global', 'pitch', 'filter', 'delay']
        const sectionWidth = p5.width / categories.length

        categories.forEach((category, sectionIndex) => {
            p5.fill(40)
            p5.noStroke()
            p5.rect(sectionIndex * sectionWidth, 60, sectionWidth, p5.height)

            p5.fill(200)
            p5.textSize(16)
            p5.text(category.toUpperCase(), sectionIndex * sectionWidth + sectionWidth / 2, 90)

            const categoryParams = parameters.filter(p => p.category === category)
            categoryParams.forEach((param, paramIndex) => {
                const parameterIndex = parameters.findIndex(p => p.name === param.name)
                const x = sectionIndex * sectionWidth + sectionWidth / 2
                const y = 160 + paramIndex * 120

                p5.push()
                p5.translate(x, y)

                p5.fill(60)
                p5.stroke(100)
                p5.strokeWeight(2)
                p5.ellipse(0, 0, 60, 60)

                p5.push()
                p5.rotate(p5.map(param.value, 0, 1, -p5.PI * 0.75, p5.PI * 0.75))
                p5.stroke(255)
                p5.line(0, 0, 25, 0)
                p5.pop()

                p5.fill(200)
                p5.noStroke()
                p5.textSize(14)
                p5.text(param.name, 0, 40)
                p5.textSize(12)
                p5.text(param.value.toFixed(2), 0, 60)

                p5.pop()

                if (p5.mouseIsPressed) {
                    const d = p5.dist(p5.mouseX, p5.mouseY, x, y)
                    if (d < 30 && activeKnob === null) {
                        setActiveKnob(parameterIndex)
                        setLastY(p5.mouseY)
                    }
                }
            })
        })

        if (activeKnob !== null) {
            const deltaY = lastY - p5.mouseY
            const newValue = p5.constrain(
                parameters[activeKnob].value + deltaY * 0.01,
                0,
                1
            )
            updateParameter(activeKnob, newValue)
            setLastY(p5.mouseY)

            if (!p5.mouseIsPressed) {
                setActiveKnob(null)
            }
        }
    }

    return (
        <Box className="relative w-full h-full">
            {/* Control Panel */}
            <HStack
                position="absolute"
                top={20}
                left="50%"
                transform="translateX(-50%)"
                spacing={4}
                bg="blackAlpha.500"
                p={2}
                borderRadius="md"
                zIndex={1}
            >
                <Button
                    onClick={triggerRun}
                    colorScheme="blue"
                    size="md"
                    variant="ghost"
                >
                    <Play />
                </Button>
                <Button
                    onClick={toggleMute}
                    variant="ghost"
                    size="md"
                    colorScheme="whiteAlpha"
                >
                    {isMuted ? <VolumeX /> : <Volume2 />}
                </Button>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-24 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
            </HStack>

            <SketchWrapper
                setup={setup}
                draw={draw}
                dimensions={dimensions}
                padding={padding}
                background={background}
                mousePressed={() => {
                    if (audioContextRef.current?.state === 'suspended') {
                        audioContextRef.current.resume()
                    }
                }}
            />
            <Text
                position="absolute"
                bottom={20}
                left="50%"
                transform="translateX(-50%)"
                fontSize="12px"
            >
                Ambient Generator, based on the IDM5r patch.
            </Text>
        </Box>
    )
}

export default Idm5r;