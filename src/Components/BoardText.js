import React from "react";
import {Text, Transformer} from "react-konva";

const BoardText = ({ shapeProps, isSelected, onSelect, onChange, onCanMove }) => {
    const shapeRef = React.useRef();
    const trRef = React.useRef();

    shapeProps = {
        key:shapeProps.selectID,
        x:shapeProps.points[0],
        y:shapeProps.points[1],
        text:shapeProps.text,
        fill:shapeProps.stroke,
        fontFamily:'Calibri',
        fontSize:18,
        draggable:onCanMove,
        listening:true,
    }

    React.useEffect(() => {
        if (onCanMove) {
            if (isSelected) {
//                const node = shapeRef.current;
                trRef.current.nodes([shapeRef.current]);
                trRef.current.getLayer().batchDraw();
//                let objectPosition = node.absolutePosition();
//                let button = document.createElement('button')
//                document.body.appendChild(button)
//                button.style.position = 'absolute';
//                button.style.top = objectPosition.y + 'px';
//                button.style.left = objectPosition.x + 'px';
            }
        }
    }, [isSelected]);

    return (
        <React.Fragment>
            <Text
                onClick={onSelect}
                onTap={onSelect}
                ref={shapeRef}
                {...shapeProps}
                onDblClick={(e) => {
                    if (onCanMove) {
                        // make textarea
                        const node = shapeRef.current;
                        node.hide()
                        let textPosition = node.absolutePosition();
                        let textarea = document.createElement('textarea');
                        document.body.appendChild(textarea);
                        textarea.value = node.text();
                        textarea.style.position = 'absolute';
                        textarea.style.top = textPosition.y + 'px';
                        textarea.style.left = textPosition.x + 'px';
                        textarea.style.width = node.width() - node.padding() * 2 + 'px';
                        textarea.style.height = node.height() - node.padding() * 2 + 5 + 'px';
                        textarea.style.fontSize = node.fontSize() + 'px';
                        textarea.style.border = 'none';
                        textarea.style.padding = '0px';
                        textarea.style.margin = '0px';
                        textarea.style.overflow = 'hidden';
                        textarea.style.background = 'none';
                        textarea.style.outline = 'none';
                        textarea.style.resize = 'none';
                        textarea.style.lineHeight = node.lineHeight();
                        textarea.style.fontFamily = node.fontFamily();
                        textarea.style.transformOrigin = 'left top';
                        textarea.style.textAlign = node.align();
                        textarea.style.color = node.fill();
                        textarea.style.height = 'auto';
                        textarea.style.height = textarea.scrollHeight + 3 + 'px';
                        textarea.focus();

                        function removeTextarea() {
                            onChange({
                                ...shapeProps,
                                text: textarea.value
                            });
                            textarea.parentNode.removeChild(textarea);
                            node.show()

                            window.removeEventListener('click', handleOutsideClick);
                        }

                        function handleOutsideClick(e) {
                            if (e.target !== textarea) {
                                removeTextarea();
                            }
                        }

                        textarea.addEventListener('keydown', function (e) {
                            // hide on enter
                            // but don't hide on shift + enter
                            if (e.keyCode === 13 && !e.shiftKey) {
                                removeTextarea();
                            }
                            // on esc do not set value back to node
                            if (e.keyCode === 27) {
                                removeTextarea();
                            }
                        });

                        setTimeout(() => {
                            window.addEventListener('click', handleOutsideClick);
                        });
                    }
                }}
                onDblTap={(e) => {
                    console.log("double tap detected")
                }}

                onDragEnd={(e) => {
                    onChange({
                        ...shapeProps,
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={(e) => {
                    const node = shapeRef.current;

                    // we will reset it back
                    node.scaleX(1);
                    node.scaleY(1);
                    onChange({
                        ...shapeProps,
                        x: node.x(),
                        y: node.y(),
                    });
                }}
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                />
            )}
        </React.Fragment>
    );
};

export default BoardText;