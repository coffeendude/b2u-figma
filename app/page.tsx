"use client";

import { fabric } from "fabric";

import LeftSidebar from "@/components/LeftSidebar";
import Live from "@/components/Live";
import Navbar from "@/components/Navbar";
import RightSidebar from "@/components/RightSidebar";
import { use, useEffect, useRef, useState } from "react";
import { handleCanvasMouseDown, handleCanvaseMouseMove, handleCanvasMouseUp, handleResize, initializeFabric, renderCanvas, handleCanvasObjectModified, handleCanvasObjectMoving, handleCanvasSelectionCreated, handleCanvasObjectScaling } from "@/lib/canvas";
import { ActiveElement, Attributes } from "@/types/type";
import { useMutation, useRedo, useStorage, useUndo } from "@/liveblocks.config";
import { defaultNavElement } from "@/constants";
import { handleDelete, handleKeyDown } from "@/lib/key-events";
import { handleImageUpload } from "@/lib/shapes";


export default function Page() {
  const undo = useUndo();
  const redo = useRedo();

  // The ref to the canvas element that is used to initialize the fabric canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The ref that allows us to perform operations on the canvas
  const fabricRef = useRef<fabric.Canvas | null>(null);
  // Boolean variable that tells us if a user is currently drawing (if the freeform drawing mode is enabled)
  const isDrawing = useRef(false);
  // Ref to shape that user is currently drawing
  const shapeRef = useRef<fabric.Object | null>(null);
  // Ref to shape that user has currently selected
  const selectedShapeRef = useRef<string | null>(null);
  // Ref to the active object
  const activeObjectRef = useRef<fabric.Object | null>(null);
  // Image object
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isEditingRef = useRef(false);

  // This hook by liveblocks allows us to store data in key/value stores and automatically sync it to other users
  const canvasObjects = useStorage((root) => root.canvasObjects)

  const [elementAttributes, setElementAttributes] = useState<Attributes >({
    width: '',
    height: '',
    fontSize: '',
    fontFamily: '',
    fontWeight: '',
    fill: '#aabbcc',
    stroke: '#aabbcc',
  })

  // This is how we update live objects
  const syncShapeInStorage = useMutation(({ storage }, object) => {
    if (!object) return;

    // If we have an object, we can extract the objectId from it by destructuring
    const { objectId } = object;

    // Turn the fabric object into JSON so that it can be stored in the key/value store
    const shapeData = object.toJSON();
    // We make sure the objectId is included in the shapeData matched with the objectId in the key/value store
    shapeData.objectId = objectId;

    // We're trying to pull existing objects from the liveblocks storage'
    const canvasObjects = storage.get('canvasObjects');

    // This syncs the shape in storage
    canvasObjects.set(objectId, shapeData);
  }, [])

  // This is how we handle the active element by determining which element is currently active (clicked)
  const [activeElement, setActiveElement] = useState<ActiveElement>({
    name: '',
    value: '',
    icon: '',
  });

  // This is how we delete all shapes from the canvas
  const deleteAllShapes = useMutation(({ storage }) => {
    // get the canvasObjects store
    const canvasObjects = storage.get("canvasObjects");

    // if the store doesn't exist or is empty, return
    if (!canvasObjects || canvasObjects.size === 0) return true;

    // delete all the shapes from the store
    for (const [key, value] of canvasObjects.entries()) {
      canvasObjects.delete(key);
    }

    // return true if the store is empty
    return canvasObjects.size === 0;
  }, []);

  const deleteShapeFromStorage = useMutation(({ storage }, objectId) => {
    const canvasObjects = storage.get('canvasObjects');

    canvasObjects.delete(objectId);
  }, []);


  // This enables the user to choose between the diferent shapes and tools from the navbar
  const handleActiveElement = (elem: ActiveElement) => {
    setActiveElement(elem);

    switch (elem?.value) {
      case 'reset':
        deleteAllShapes();
        fabricRef.current?.clear();
        setActiveElement(defaultNavElement);
        break;

      case 'delete':
        handleDelete(fabricRef.current as any, deleteShapeFromStorage);
        setActiveElement(defaultNavElement);
        break;

      case 'image':
        // trigger the click event on the input element which opens the file dialog
        imageInputRef.current?.click();
        /**
         * set drawing mode to false
         * If the user is drawing on the canvas, we want to stop the
         * drawing mode when clicked on the image item from the dropdown.
         */
        isDrawing.current = false;

        // disable the drawing mode of canvas
        if(fabricRef.current) {
          fabricRef.current.isDrawingMode = false;
        }
        break;

      default:
        // set the selected shape to the selected element
        selectedShapeRef.current = elem?.value as string;
        break;
    }
  }

  // When we leave the dependency array empty, the effect will only run once when the component mounts (at the start)
  useEffect(() => {
    const canvas = initializeFabric({ canvasRef, fabricRef });

    canvas.on('mouse:down', (options) => {
      handleCanvasMouseDown({ canvas, isDrawing, options, shapeRef, selectedShapeRef });
    })

    canvas.on('mouse:move', (options) => {
      handleCanvaseMouseMove({ canvas, isDrawing, options, shapeRef, selectedShapeRef, syncShapeInStorage });
    })

    canvas.on('mouse:up', () => {
      handleCanvasMouseUp({ canvas, isDrawing, shapeRef, selectedShapeRef, syncShapeInStorage, setActiveElement, activeObjectRef });
    })

    canvas.on("object:modified", (options) => {
      handleCanvasObjectModified({
        options,
        syncShapeInStorage
      })
    })

    canvas.on("object:scaling", (options) => {
      handleCanvasObjectScaling({
        options,
        setElementAttributes
      })
    })

    /**
     * listen to the object moving event on the canvas which is fired
     * when the user moves an object on the canvas.
     *
     * Event inspector: http://fabricjs.com/events
     * Event list: http://fabricjs.com/docs/fabric.Canvas.html#fire
     */
    canvas?.on("object:moving", (options) => {
      handleCanvasObjectMoving({
        options,
      });
    });

    canvas.on("selection:created", (options: any) => {
      handleCanvasSelectionCreated({
        options,
        isEditingRef,
        setElementAttributes,
      
      })
    })

    /**
     * listen to the object moving event on the canvas which is fired
     * when the user moves an object on the canvas.
     *
     * Event inspector: http://fabricjs.com/events
     * Event list: http://fabricjs.com/docs/fabric.Canvas.html#fire
     */
    canvas?.on("object:moving", (options) => {
      handleCanvasObjectMoving({
        options,
      });
    });

    // Resize element
    window.addEventListener("resize", () => {
      handleResize({
        canvas: fabricRef.current,
      });
    });

    window.addEventListener("keydown", (e) => {
      handleKeyDown({
        e,
        canvas: fabricRef.current,
        undo,
        redo,
        syncShapeInStorage,
        deleteShapeFromStorage
      })
    });

    return () => {
      canvas.dispose();

      // remove the event listeners
      window.removeEventListener("resize", () => {
        handleResize({
          canvas: null,
        });
      });

      window.removeEventListener("keydown", (e) =>
        handleKeyDown({
          e,
          canvas: fabricRef.current,
          undo,
          redo,
          syncShapeInStorage,
          deleteShapeFromStorage,
        })
      );
    };

  }, [canvasRef]);

  // Re-render objects everytime there's a change in the canvasObjects
  useEffect(() => {
    renderCanvas({
      fabricRef,
      canvasObjects,
      activeObjectRef
    })
  }, [canvasObjects])

  return (
    <main className="h-screen overflow-hidden">
      <Navbar
        activeElement={activeElement}
        handleActiveElement={handleActiveElement}
        imageInputRef={imageInputRef}
        handleImageUpload={(e: any) => {
          // prevents default behavior of input element
          e.stopPropagation();

          // from shapes.ts - gets a new file reader, load image to canvas, set it to default size, and add it to local storage
          handleImageUpload({
            file: e.target.files[0],
            canvas: fabricRef as any,
            shapeRef,
            syncShapeInStorage
          });
        }}
      />
      <section className="flex h-full flex-row">
        <LeftSidebar allShapes={Array.from(canvasObjects)} />
        <Live canvasRef={canvasRef} />
        <RightSidebar 
          elementAttributes={elementAttributes}
          setElementAttributes={setElementAttributes}
          fabricRef={fabricRef}
          isEditingRef={isEditingRef}
          activeObjectRef={activeObjectRef}
          syncShapeInStorage={syncShapeInStorage}
        />
      </section>
    </main>
  );
}

// rafce -> react arrow function component export