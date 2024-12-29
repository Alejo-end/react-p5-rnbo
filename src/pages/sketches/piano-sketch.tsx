import SketchWrapper from 'components/SketchWrapper'
import { NextPage } from 'next'
import { useState } from 'react'
import { ColorValue, Draw, Setup } from 'types/CustomP5'

const PianoSketch: NextPage = () => {
    // Canvas dimensions and styling
    const width: number = 4 * 60 // 240px total width (4 * 60)
    const height: number = 220
    const dimensions: number[] = [width, height]
    const padding: number[] = [40]
    const background: ColorValue = [200] // Gray background like original

    // State for tracking pressed keys
    const [pressedKeys, setPressedKeys] = useState([false, false, false, false, false, false])

    const setup: Setup = p5 => {
        // Any additional setup can go here
    }

    const draw: Draw = p5 => {
        const keyWidth = 60
        const keyHeight = 220
        const blackKeyOffset = 40
        const whiteKeys = [true, true, true, true, true, true]
        const blackKeys = [true, true, true]

        // Draw white keys
        for (let i = 0; i < whiteKeys.length; i++) {
            if (pressedKeys[i]) {
                p5.fill(255, 255, 150) // Bright color for pressed key
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
        const keyWidth = 60
        const whiteKeys = [true, true, true, true, true, true]

        // Detect if a white key was pressed
        for (let i = 0; i < whiteKeys.length; i++) {
            if (p5.mouseX > i * keyWidth && p5.mouseX < (i + 1) * keyWidth) {
                const newPressedKeys = [...pressedKeys]
                newPressedKeys[i] = true
                setPressedKeys(newPressedKeys)
                console.log(`Key ${i} pressed`)
            }
        }
    }

    const mouseReleased = () => {
        setPressedKeys([false, false, false, false, false, false])
    }

    return (
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
        </div>
    )
}

export default PianoSketch