"use client";

import { fabric } from "fabric";

import LeftSidebar from "@/components/LeftSidebar";
import Live from "@/components/Live";
import Navbar from "@/components/Navbar";
import RightSidebar from "@/components/RightSidebar";
import { use, useEffect, useRef, useState } from "react";
import { handleCanvasMouseDown, handleCanvaseMouseMove, handleCanvasMouseUp, handleResize, initializeFabric, renderCanvas, handleCanvasObjectModified, handleCanvasObjectMoving } from "@/lib/canvas";
import { ActiveElement } from "@/types/type";
import { useMutation, useStorage } from "@/liveblocks.config";
import { defaultNavElement } from "@/constants";
import { handleDelete } from "@/lib/key-events";


export default function Page() {
  // The ref to the canvas element that is used to initialize the fabric canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The ref that allows us to perform operations on the canvas
  const fabricRef = useRef<fabric.Canvas | null>(null);
  // Boolean variable that tells us if a user is currently drawing (if the freeform drawing mode is enabled)
  const isDrawing = useRef(false);
  // Ref to shape that user is currently drawing
  const shapeRef = useRef<fabric.Object | null>(null);
  // Ref to shape that user has currently selected
  const selectedShapeRef = useRef<string | null>('null');
  // Ref to the active object
  const activeObjectRef = useRef<fabric.Object | null>(null);

  // This hook by liveblocks allows us to store data in key/value stores and automatically sync it to other users
  const canvasObjects = useStorage((root) => root.canvasObjects)

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
  })

  const deleteAllShapes = useMutation(({ storage }) => {
    const canvasObjects = storage.get('canvasObjects');

    if (!canvasObjects || canvasObjects.size === 0) return true;

    for (const [key, value] of canvasObjects) {
      canvasObjects.delete(key);
    }

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

      default:
        break;
    }

    selectedShapeRef.current = elem?.value as string;
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

    canvas.on('mouse:up', (options) => {
      handleCanvasMouseUp({ canvas, isDrawing, shapeRef, selectedShapeRef, syncShapeInStorage, setActiveElement, activeObjectRef });
    })

    canvas.on("object:modified", (options) => {
      handleCanvasObjectModified({
        options,
        syncShapeInStorage
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

    return () => {
      canvas.dispose();
    }

  }, []);

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
      />
      <section className="flex h-full flex-row">
        <LeftSidebar />
        <Live canvasRef={canvasRef} />
        <RightSidebar />
      </section>
    </main>
  );
}

// rafce -> react arrow function component export