// @ts-nocheck
import { Button, Box, Flex } from '@chakra-ui/react'
import { createDevice } from '@rnbo/js'
import SketchWrapper from 'components/SketchWrapper'
import { Volume2, VolumeX } from 'lucide-react'
import { NextPage } from 'next'
import { useEffect, useRef, useState } from 'react'
import { ColorValue, Draw, Setup } from 'types/CustomP5'

interface AudioVisualizerProps {
    children?: React.ReactNode;
}

const AudioVisualizer: NextPage<AudioVisualizerProps> = ({ children }) => {
    // State for dimensions
    const [dimensions, setDimensions] = useState<number[]>([1024, 768])
    const padding: number[] = [0]
    const background: ColorValue = [0, 0, 100]

    // Refs for audio context and parameters
    const childrenContainerRef = useRef(null)
    const audioContextRef = useRef(null)
    const deviceRef = useRef(null)
    const xParamRef = useRef(null)
    const yParamRef = useRef(null)
    const gainParamRef = useRef(null)
    const reactRootRef = useRef(null)

    // State
    const [isMuted, setIsMuted] = useState(false)
    const [volume, setVolume] = useState(1)
    const [gainValue, setGainValue] = useState<number>()

    // Update dimensions when window is available
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setDimensions([window.innerWidth, window.innerHeight])

            const handleResize = () => {
                setDimensions([window.innerWidth, window.innerHeight])
            }

            window.addEventListener('resize', handleResize)
            return () => window.removeEventListener('resize', handleResize)
        }
    }, [])

    const initAudio = async (p5: any) => {
        if (typeof window !== 'undefined' && !audioContextRef.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext
            audioContextRef.current = new AudioContext()
            await loadRNBO(audioContextRef.current)
        }
    }

    const loadRNBO = async (audioContext: AudioContext) => {
        await audioContext.resume()

        const rawPatcher = await fetch('/patches/patch.export.json')
        const patcher = await rawPatcher.json()

        const device = await createDevice({ context: audioContext, patcher })
        deviceRef.current = device

        device.node.connect(audioContext.destination)

        xParamRef.current = device.parametersById.get('x')
        yParamRef.current = device.parametersById.get('y')

        const gainParam = device.parametersById.get('gain')
        gainParamRef.current = gainParam

        if (gainParam) {
            setGainValue(gainParam.normalizedValue)
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

        initAudio(p5)
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
            gainParamRef.current.normalizedValue = newMutedState ? 0 : 0.6
        }
    }

    const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(event.target.value)
        setVolume(newVolume)

        if (gainParamRef.current && !isMuted) {
            gainParamRef.current.normalizedValue = newVolume
        }
    }

    useEffect(() => {
        return () => {
            if (reactRootRef.current) {
                reactRootRef.current.unmount()
                reactRootRef.current = null
            }

            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
        }
    }, [])

    useEffect(() => {
        if (reactRootRef.current && children) {
            reactRootRef.current.render(children)
        }
    }, [children])

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
            <Box
                ref={childrenContainerRef}
                position="absolute"
                left="50%"
                top="50%"
                transform="translate(-50%, -50%)"
                pointerEvents="none"
            />
        </Box>
    )
}

export default AudioVisualizer