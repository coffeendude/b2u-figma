import React from 'react'
import Dimensions from './settings/Dimensions'
import Text from './settings/Text'
import Color from './settings/Color'
import Export from './settings/Export'
import { RightSidebarProps } from '@/types/type'
import { modifyShape } from '@/lib/shapes'

const RightSidebar = ({
    elementAttributes,
    setElementAttributes,
    fabricRef,
    activeObjectRef,
    isEditingRef,
    syncShapeInStorage
}: RightSidebarProps) => {
    const handleInputChange = (property: string, value: string) => {
        /* This is editing ref checks out if your're editing elements manually through the fields - 
        if so, we need to turn it on to know how to change those shapes */
        if (!isEditingRef.current) isEditingRef.current = true;

        /* here we want to take the previous attributes of the element and return the spread of the
        previous elements and update the specific property to that property value that is changing
        ...so, if we want to change the color, property will be 'color' and the value will be the actual color */
        setElementAttributes((prev) => ({ ...prev, [property]: value }));

        modifyShape({
            canvas: fabricRef.current as fabric.Canvas,
            property,
            value,
            activeObjectRef,
            syncShapeInStorage
        })
    }
    return (
        <section className="flex flex-col border-t border-primary-grey-200 bg-primary-black text-primary-grey-300 min-2-[227px] sticky right-0 h-full max-sm:hidden select-none">
            <h3 className="px-5 pt-4 text-xs uppercase">Design</h3>
            <span className='text-xs text-primary-grey-300 mt-3 px-5 border-b border-primary-grey-200 pb-4'>Make Changes as You Like:</span>

            <Dimensions
                width={elementAttributes.width}
                height={elementAttributes.height}
                handleInputChange={handleInputChange}
                isEditingRef={isEditingRef}
            />
            <Text 
                fontFamily={elementAttributes.fontFamily}
                fontSize={elementAttributes.fontSize}
                fontWeight={elementAttributes.fontWeight}
                handleInputChange={handleInputChange}
            />
            <Color />
            <Color />
            <Export />
        </section>
    )
}

export default RightSidebar