"use client";

import { fabric } from "fabric";

import LeftSidebar from "@/components/LeftSidebar";
import Live from "@/components/Live";
import Navbar from "@/components/Navbar";
import RightSidebar from "@/components/RightSidebar";
import { useEffect, useRef, useState } from "react";
import { handleCanvasMouseDown, handleResize, initializeFabric } from "@/lib/canvas";
import { ActiveElement } from "@/types/type";


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

  // This is how we handle the active element by determining which element is currently active (clicked)
  const [activeElement, setActiveElement] = useState<ActiveElement>({
    name: '',
    value: '',
    icon: '',
  })
// This enables the user to choose between the diferent shapes and tools from the navbar
  const handleActiveElement = (elem: ActiveElement) => {
    setActiveElement(elem);

    selectedShapeRef.current = elem?.value as string;
  }

  // When we leave the dependency array empty, the effect will only run once when the component mounts (at the start)
  useEffect(() => {
    const canvas = initializeFabric({ canvasRef, fabricRef });

    canvas.on('mouse:down', (options) => {
      handleCanvasMouseDown({ canvas, isDrawing, options, shapeRef, selectedShapeRef });
    })
    
    // Resize element
    window.addEventListener('resize', () => {
      handleResize({ canvas: fabricRef.current });
    })

  }, []);

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