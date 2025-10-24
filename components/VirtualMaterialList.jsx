'use client'

import { FixedSizeList as List } from 'react-window'
import MaterialCard from './MaterialCard'

/**
 * Virtual Scrolling Material List
 * Renders only visible items for better performance with long lists
 */
export default function VirtualMaterialList({
  materials,
  getCategoryIcon,
  getFileIcon,
  getCategoryLabel,
  height = 600,
  itemHeight = 100
}) {
  if (!materials || materials.length === 0) {
    return null
  }

  // Row renderer for react-window
  const Row = ({ index, style }) => {
    const material = materials[index]

    return (
      <div style={{...style, padding: '8px 0'}}>
        <MaterialCard
          material={material}
          getCategoryIcon={getCategoryIcon}
          getFileIcon={getFileIcon}
          getCategoryLabel={getCategoryLabel}
        />
      </div>
    )
  }

  // For small lists (< 20 items), use regular rendering (no virtualization needed)
  if (materials.length < 20) {
    return (
      <div className="space-y-3">
        {materials.map((material) => (
          <MaterialCard
            key={material.id}
            material={material}
            getCategoryIcon={getCategoryIcon}
            getFileIcon={getFileIcon}
            getCategoryLabel={getCategoryLabel}
          />
        ))}
      </div>
    )
  }

  // For large lists, use virtualization
  return (
    <List
      height={height}
      itemCount={materials.length}
      itemSize={itemHeight}
      width="100%"
      className="space-y-3"
    >
      {Row}
    </List>
  )
}
