export const resolveResponsiveOrderViewportWidth = (windowWidth, screenWidth) => {
  const normalizedWindowWidth = Number(windowWidth || 0)
  if (normalizedWindowWidth > 0) {
    return normalizedWindowWidth
  }

  return Number(screenWidth || 0)
}

const resolveResponsiveOrderColumns = width => {
  const safeWidth = Number(width || 0)

  if (safeWidth >= 2320) return 6
  if (safeWidth >= 1920) return 5
  if (safeWidth >= 1600) return 4
  if (safeWidth >= 1200) return 3
  if (safeWidth >= 900) return 2
  return 1
}

export default resolveResponsiveOrderColumns
export { resolveResponsiveOrderColumns }
