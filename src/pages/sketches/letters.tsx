import SketchWrapper from 'components/SketchWrapper';
import { NextPage } from 'next';
import { Text } from '@chakra-ui/react';
import type { Font } from 'p5';
import { useRef } from 'react';

import { ColorValue, Draw, KeyPressed, MouseClicked, P5 } from 'types/CustomP5';

const Letters: NextPage = () => {
    const width: number = 500;
    const height: number = 500;
    const dimensions: number[] = [width, height];
    const background: ColorValue = [0, 0, 0];
    const padding: number[] = [0];

    // The page re-renders after p5 starts, and p5 then calls the newest
    // draw, which cannot see a variable that the first render's preload set.
    const fontRef = useRef<Font | null>(null);
    const txt = "Aalto?";
    const xTxt = width / 2, yTxt = height / 2;
    const fontSize = 100;

    const preload = (p5: P5) => {
        fontRef.current = p5.loadFont('/fonts/HostGrotesk-Regular.ttf');
    };
    const draw: Draw = (p5) => {
        // On a narrow window the canvas shrinks to fit; the text shrinks with it.
        const scale = p5.width / width;
        const points = computePoints(p5.map(p5.mouseX / scale, 0, width, 0.005, 0.1, true));

        p5.background(0);
        p5.scale(scale);
        p5.noFill();
        p5.stroke(255);

        p5.beginShape();
        for (let i = 0; i < points.length; i++) {
            p5.vertex(points[i].x, points[i].y);
        }
        p5.endShape();

        p5.fill(0);
        p5.strokeWeight(2);
        for (let i = 0; i < points.length; i++) {
            p5.circle(points[i].x, points[i].y, 10);
        }
    };

    const computePoints = (factor: number): { x: number; y: number }[] => {
        const font = fontRef.current;
        if (!font) return [];
        const points = font.textToPoints(txt, xTxt, yTxt, fontSize, {
            sampleFactor: factor,
        }) as { x: number; y: number }[];

        const bounds = font.textBounds(txt, xTxt, yTxt, fontSize) as { x: number; w: number; h: number };
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            p.x -= bounds.x - xTxt + bounds.w / 2;
            p.y += bounds.h / 2;
        }
        return points;
    };

    const keyPressed: KeyPressed = (p5) => {
        if (p5.key === 's') {
            p5.saveCanvas('letters.png');
        }
    };

    const mouseClicked: MouseClicked = (p5) => {
        p5.redraw();
    };

    return (
        <div className="cursor-pointer">
            <SketchWrapper
                preload={preload}
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
                <b>Letters</b>.
                <br />
                <b>Move</b> the mouse to change text points.
            </Text>
        </div>
    );
};

export default Letters;
