import { NextPage } from 'next'
import { ColorValue, Draw, Setup } from 'types/CustomP5'
import { createDevice, TimeNow, MessageEvent, Device } from '@rnbo/js'
import { useRef, useState, useEffect } from 'react'
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

const AmbientGenerator: NextPage = () => {
    const [dimensions, setDimensions] = useState<[number, number]>([800, 400])
    const padding: number[] = [20]
    const background: ColorValue = [30]

    const audioContextRef = useRef<AudioContext | null>(null)
    const deviceRef = useRef<Device | null>(null)
    const gainNodeRef = useRef<GainNode | null>(null)

    const [volume, setVolume] = useState<number>(0.8)
    const [isMuted, setIsMuted] = useState<boolean>(false)
    const [knobSize, setKnobSize] = useState<number>(60)
    const [textSize, setTextSize] = useState<number>(14)
    const [spacing, setSpacing] = useState<number>(120)

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

    // Add resize handler
    useEffect(() => {
        const updateDimensions = () => {
            const width = Math.min(window.innerWidth - 40, 800)
            const height = Math.min(window.innerHeight - 120, 400)
            const sectionWidth = width / 4 // 4 categories

            // Calculate sizes based on screen width
            const newKnobSize = Math.min(60, sectionWidth * 0.3)
            const newTextSize = Math.min(14, newKnobSize * 0.3)
            const newSpacing = Math.min(120, height * 0.25)

            setDimensions([width, height])
            setKnobSize(newKnobSize)
            setTextSize(newTextSize)
            setSpacing(newSpacing)
        }

        updateDimensions()
        window.addEventListener('resize', updateDimensions)
        return () => window.removeEventListener('resize', updateDimensions)
    }, [])

    // Rest of your existing functions...
    const initAudio = async () => {
        if (typeof window !== 'undefined' && !audioContextRef.current) {
            const AudioContext = window.AudioContext
            audioContextRef.current = new AudioContext()
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
            p5.textSize(textSize * 1.2)
            p5.text(category.toUpperCase(), sectionIndex * sectionWidth + sectionWidth / 2, 90)

            const categoryParams = parameters.filter(p => p.category === category)
            categoryParams.forEach((param, paramIndex) => {
                const parameterIndex = parameters.findIndex(p => p.name === param.name)
                const x = sectionIndex * sectionWidth + sectionWidth / 2
                const y = 160 + paramIndex * spacing

                p5.push()
                p5.translate(x, y)

                p5.fill(60)
                p5.stroke(100)
                p5.strokeWeight(2)
                p5.ellipse(0, 0, knobSize, knobSize)

                p5.push()
                p5.rotate(p5.map(param.value, 0, 1, -p5.PI * 0.75, p5.PI * 0.75))
                p5.stroke(255)
                p5.line(0, 0, knobSize * 0.4, 0)
                p5.pop()

                p5.fill(200)
                p5.noStroke()
                p5.textSize(textSize)
                p5.text(param.name, 0, knobSize * 0.8)
                p5.textSize(textSize * 0.8)
                p5.text(param.value.toFixed(2), 0, knobSize * 1.2)

                p5.pop()

                if (p5.mouseIsPressed || (p5.touches && p5.touches.length > 0)) {
                    const mx = p5.mouseIsPressed ? p5.mouseX : p5.touches[0].x
                    const my = p5.mouseIsPressed ? p5.mouseY : p5.touches[0].y
                    const d = p5.dist(mx, my, x, y)
                    if (d < knobSize / 2 && activeKnob === null) {
                        setActiveKnob(parameterIndex)
                        setLastY(my)
                    }
                }
            })
        })

        if (activeKnob !== null) {
            const currentY = p5.mouseIsPressed ? p5.mouseY : (p5.touches && p5.touches.length > 0 ? p5.touches[0].y : lastY)
            const deltaY = lastY - currentY
            const newValue = p5.constrain(
                parameters[activeKnob].value + deltaY * 0.01,
                0,
                1
            )
            updateParameter(activeKnob, newValue)
            setLastY(currentY)

            if (!p5.mouseIsPressed && (!p5.touches || p5.touches.length === 0)) {
                setActiveKnob(null)
            }
        }
    }

    return (
        <Box className="relative w-full h-full">
            <HStack
                position="absolute"
                top={4}
                left="50%"
                transform="translateX(-50%)"
                spacing={2}
                bg="blackAlpha.500"
                p={2}
                borderRadius="md"
                zIndex={1}
            >
                <Button
                    onClick={triggerRun}
                    colorScheme="blue"
                    size="sm"
                    variant="ghost"
                >
                    <Play />
                </Button>
                <Button
                    onClick={toggleMute}
                    variant="ghost"
                    size="sm"
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
                    className="w-20 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
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
                bottom={4}
                left="50%"
                transform="translateX(-50%)"
                fontSize="12px"
            >
                Ambient Generator, based on the IDM5r patch.
            </Text>
        </Box>
    )
}

export default AmbientGenerator;