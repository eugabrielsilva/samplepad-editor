const splitPath = (filePath) => {
  const path = String(filePath)
  const queryIndex = path.search(/[?#]/)
  const pathWithoutQuery = queryIndex === -1 ? path : path.slice(0, queryIndex)
  const separatorIndex = pathWithoutQuery.lastIndexOf('/')
  const dir = separatorIndex === -1 ? '' : pathWithoutQuery.slice(0, separatorIndex)
  const base = separatorIndex === -1 ? pathWithoutQuery : pathWithoutQuery.slice(separatorIndex + 1)
  const dotIndex = base.lastIndexOf('.')
  const hasExtension = dotIndex > 0
  const isUrl = pathWithoutQuery.includes('://')
  const decode = (value) => {
    if (!isUrl) {
      return value
    }

    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  return {
    root: isUrl
      ? pathWithoutQuery.slice(0, pathWithoutQuery.indexOf('://') + 3)
      : '',
    dir,
    base: decode(base),
    ext: hasExtension ? base.slice(dotIndex) : '',
    name: decode(hasExtension ? base.slice(0, dotIndex) : base)
  }
}

export const capacitorPath = {
  parse: splitPath
}
