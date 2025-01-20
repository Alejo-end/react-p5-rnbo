import SketchWrapper from 'components/SketchWrapper';
import { NextPage } from 'next';
import { Text } from '@chakra-ui/react';

import { ColorValue, Draw, KeyPressed, MouseClicked, Setup } from 'types/CustomP5';

const Letters: NextPage = () => {
    const width: number = 500;
    const height: number = 500;
    const dimensions: number[] = [width, height];
    const background: ColorValue = [0, 0, 0];
    const padding: number[] = [0];

    let font: any;
    let points: any[] = [];
    const txt = "Aalto?";
    let xTxt = 0, yTxt = 250;
    const fontSize = 100;

    const preload = (p5: any) => {
        font = p5.loadFont('/fonts/HostGrotesk-Regular.ttf');
    };
    const setup: Setup = (p5) => {
        p5.createCanvas(width, height);
        xTxt = width / 2;
        yTxt = height / 2;
        computePoints(p5, 0.1);
    };

    const draw: Draw = (p5) => {
        computePoints(p5, p5.map(p5.mouseX, 0, width, 0.005, 0.1));

        p5.background(0);
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

    const computePoints = (p5: any, factor: number) => {
        points = font.textToPoints(txt, xTxt, yTxt, fontSize, {
            sampleFactor: factor,
        });

        const bounds = font.textBounds(txt, xTxt, yTxt, fontSize);
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            p.x -= bounds.x - xTxt + bounds.w / 2;
            p.y += bounds.h / 2;
        }
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
                <b>Letters</b>.
                <br />
                <b>Move</b> the mouse to change text points.
            </Text>
        </div>
    );
};

export default Letters;
