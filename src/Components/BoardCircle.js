import React from "react";
import {Circle, Transformer} from "react-konva";

const BoardCircle = ({ shapeProps, isSelected, onSelect, onChange, onCanMove }) => {
    const shapeRef = React.useRef();
    const trRef = React.useRef();

    shapeProps = {
        key:shapeProps.selectID,
        x:shapeProps.points[0],
        y:shapeProps.points[1],
        radius:shapeProps.radius,
        fill:shapeProps.stroke,
        draggable:onCanMove,
        listening:true,
    }

    React.useEffect(() => {
        if (onCanMove) {
            if (isSelected) {
                trRef.current.nodes([shapeRef.current]);
                trRef.current.getLayer().batchDraw();
            }
        }
    }, [isSelected]);

    return (
        <React.Fragment>
            <Circle
                onClick={onSelect}
                onTap={onSelect}
                ref={shapeRef}
                {...shapeProps}
                onCanMove
                onDragEnd={(e) => {
                    onChange({
                        ...shapeProps,
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={() => {
                    const node = shapeRef.current;
                    const scaleX = node.scaleX();
                    node.scaleX(1);
                    node.scaleY(1);
                    onChange({
                        ...shapeProps,
                        x: node.x(),
                        y: node.y(),
                        radius: Math.max(5, node.radius() * scaleX),
                    });
                }}
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 5 || newBox.height < 5) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            )}
        </React.Fragment>
    );
};

export default BoardCircle