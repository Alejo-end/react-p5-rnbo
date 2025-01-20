import SketchWrapper from 'components/SketchWrapper'
import { NextPage } from 'next'
import { Text } from '@chakra-ui/react'

import { ColorValue, Draw, KeyPressed, MouseClicked, Setup } from 'types/CustomP5'

const Generatif: NextPage = () => {
    const width: number = 2048
    const height: number = 2048
    const dimensions: number[] = [width, height]
    const background: ColorValue = [255, 253, 252]
    const padding: number[] = [40]
    let nb = 30;
    let dim = 0;
    let margin = 0;

    const setup: Setup = p5 => {
        dim = (width - 2 * margin) / nb;
        p5.noLoop()
    }

    const draw: Draw = p5 => {
        p5.background(255)
        for (let j = 0; j < nb; j = j + 1) {
            for (let i = 0; i < nb; i = i + 1) {
                let x = margin + i * dim;
                let y = margin + j * dim;
                p5.noFill();
                // stroke(220);
                // rect(x,y, dim, dim);
                p5.stroke(0);
                p5.strokeWeight(4);
                let rnd = p5.int(p5.random(0, 4));
                if (rnd == 0) {
                    p5.line(x, y, x + dim, y + dim);
                }
                else if (rnd == 1) {
                    p5.line(x, y + dim, x + dim, y);
                }
                else if (rnd == 2) {
                    p5.line(x + dim/2, y, x + dim/2, y + dim);
                }
                else {
                    p5.line(x, y + dim/2, x + dim, y + dim/2);
                }
            }
        }
    }

    const keyPressed: KeyPressed = p5 => {
        if (p5.key === 's') {
            p5.save('generatif.png')
        }
    }

    const mouseClicked: MouseClicked = p5 => {
        p5.redraw()
    }

    return (
        <div className="cursor-pointer">
            <SketchWrapper
                setup={setup}
                draw={draw}
                keyPressed={keyPressed}
                mouseClicked={mouseClicked}
                dimensions={dimensions}
                padding={padding}
                background={background}
            />

            <Text
                position="absolute"
                bottom="5%"
                w="100px"
                left="5%"
                transform="translateX(-50%)"
                fontSize="12px"
                userSelect="none"
                >
                    <b>Generatif</b>  - based on the work of Vera Molnár.
                    <br />
                    <b>Click</b> to redraw. <b>'s'</b> to save.
                </Text>
            </div>
    )
}

export default Generatif;