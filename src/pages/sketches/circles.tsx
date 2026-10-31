import SketchWrapper from 'components/SketchWrapper'
import { NextPage } from 'next'
import { ColorValue, Draw, Setup } from 'types/CustomP5'

const Circles: NextPage = () => {
    const width: number = 2048
    const height: number = 2048
    const dimensions: number[] = [width, height]
    const background: ColorValue = [255, 253, 252]
    const padding: number[] = [40]
    const nb = 10;
    const margin = 80;
    const dim = (width - 2 * margin) / nb;

    const setup: Setup = p5 => {
        p5.background(background)
    }

    const draw: Draw = p5 => {
        p5.background(0)
        // The grid is laid out at 2048 px; the canvas fits the window.
        p5.scale(p5.width / width)
        //noStroke;
        //fill (255); 
        p5.stroke(255);
        p5.noFill();
        p5.rectMode(p5.CENTER);
        for (let j = 0; j < nb; j = j + 1) {
            for (let i = 0; i < nb; i = i + 1) {
                p5.circle(margin + dim / 2 + i * dim, margin + dim / 2 + j * dim, dim)
                p5.rect(dim/2+i*dim, dim/2+j*dim,0.6*dim,0.4*dim);
            }
        }
    }

    return (
        <SketchWrapper
            setup={setup}
            draw={draw}
            dimensions={dimensions}
            padding={padding}
            background={background}
        />
    )
}

export default Circles
