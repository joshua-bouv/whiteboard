import React from "react";
import {Rect, Transformer} from "react-konva";

const BoardRectangle = ({ shapeProps, isSelected, onSelect, onChange, onCanMove }) => {
    const shapeRef = React.useRef();
    const trRef = React.useRef();

    shapeProps = {
        key:shapeProps.selectID,
        x:shapeProps.points[0],
        y:shapeProps.points[1],
        width:shapeProps.size[0],
        height:shapeProps.size[1],
        fill:shapeProps.stroke,
        draggable:true,
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
            <Rect
                onClick={onSelect}
                onTap={onSelect}
                ref={shapeRef}
                {...shapeProps}
                draggable
                onDragEnd={(e) => {
                    onChange({
                        ...shapeProps,
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={(e) => {
                    const node = shapeRef.current;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    // we will reset it back
                    node.scaleX(1);
                    node.scaleY(1);
                    onChange({
                        ...shapeProps,
                        x: node.x(),
                        y: node.y(),
                        width: Math.max(5, node.width() * scaleX),
                        height: Math.max(1, node.height() * scaleY),
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

export default BoardRectangle