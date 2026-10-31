import { Button, Box, Flex, Text } from '@chakra-ui/react'
import { createDevice, Device, IPatcher, Parameter } from '@rnbo/js'
import SketchWrapper from 'components/SketchWrapper'
import { Volume2, VolumeX } from 'lucide-react'
import { NextPage } from 'next'
import { useEffect, useRef, useState } from 'react'
import { ColorValue, Draw, Setup } from 'types/CustomP5'

const AudioVisualizer: NextPage = () => {
    // State for dimensions
    // Only p5 reads this, so the window size can seed it on the client
    // without a hydration mismatch.
    const [dimensions, setDimensions] = useState<number[]>(() =>
        typeof window !== 'undefined' ? [window.innerWidth, window.innerHeight] : [1024, 768]
    )
    const padding: number[] = [0]
    const background: ColorValue = [0, 0, 100]

    // Refs for audio context and parameters
    const audioContextRef = useRef<AudioContext | null>(null)
    const deviceRef = useRef<Device | null>(null)
    const xParamRef = useRef<Parameter | null>(null)
    const yParamRef = useRef<Parameter | null>(null)
    const gainParamRef = useRef<Parameter | null>(null)
    // The patch's own gain, restored on unmute
    const gainValueRef = useRef(0.6)

    // State
    const [isMuted, setIsMuted] = useState(false)

    // Follow the window size
    useEffect(() => {
        const handleResize = () => {
            setDimensions([window.innerWidth, window.innerHeight])
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const initAudio = async () => {
        if (typeof window !== 'undefined' && !audioContextRef.current) {
            audioContextRef.current = new AudioContext()
            await loadRNBO(audioContextRef.current)
        }
    }

    const loadRNBO = async (audioContext: AudioContext) => {
        await audioContext.resume()

        const rawPatcher = await fetch('/patches/patch.export.json')
        const patcher: IPatcher = await rawPatcher.json()

        const device = await createDevice({ context: audioContext, patcher })
        deviceRef.current = device

        device.node.connect(audioContext.destination)

        xParamRef.current = device.parametersById.get('x') ?? null
        yParamRef.current = device.parametersById.get('y') ?? null

        const gainParam = device.parametersById.get('gain') ?? null
        gainParamRef.current = gainParam

        if (gainParam) {
            gainValueRef.current = gainParam.normalizedValue
        }
    }

    const setup: Setup = (p5) => {
        p5.noCursor()
        p5.colorMode(p5.HSB, 360, 100, 100)
        p5.rectMode(p5.CENTER)
        p5.noStroke()

        p5.mousePressed = () => {
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume()
            }
        }

        initAudio()
    }

    const draw: Draw = (p5) => {
        p5.background(p5.mouseY / 2, 100, 100)
        p5.fill(360 - p5.mouseY / 2, 100, 100)

        const size = Math.min(p5.width, p5.height) * 0.8
        p5.circle(p5.width / 2, p5.height / 2, p5.map(p5.mouseX, 0, p5.width, 0, size))

        const yValue = p5.map(p5.mouseY, 0, p5.height, 0, 1)
        const xValue = p5.map(p5.mouseX, 0, p5.width, 0, 1)

        if (yParamRef.current) {
            yParamRef.current.normalizedValue = yValue
        }
        if (xParamRef.current) {
            xParamRef.current.normalizedValue = xValue
        }
    }

    const toggleMute = () => {
        const newMutedState = !isMuted
        setIsMuted(newMutedState)

        if (gainParamRef.current) {
            gainParamRef.current.normalizedValue = newMutedState ? 0 : gainValueRef.current
        }
    }

    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
        }
    }, [])

    return (
        <Box position="relative" w="full" h="100vh">
            {/* Top Controls */}
            <Flex position="absolute" top={10} left={4} right={4} justifyContent="center" zIndex={10}>
                <Flex alignItems="center" gap={4} rounded="md" bg="blackAlpha.700" p={2}>
                    <Button
                        onClick={toggleMute}
                        variant="ghost"
                        size="sm"
                        colorScheme="whiteAlpha"
                        aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </Button>
                </Flex>
            </Flex>

            <SketchWrapper
                setup={setup}
                draw={draw}
                dimensions={dimensions}
                padding={padding}
                background={background}
            />
            <Text
                position="absolute"
                bottom={20}
                left="50%"
                transform="translateX(-50%)"
                fontSize="12px"
            >
                Mouse Theremin, based on a phasor help patch.
            </Text>
        </Box>
    )
}

export default AudioVisualizer