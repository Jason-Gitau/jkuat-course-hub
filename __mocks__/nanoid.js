// Mock for nanoid
let counter = 0

const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export const nanoid = jest.fn((length = 21) => {
  counter++
  // Generate a simple alphanumeric ID by cycling through the alphabet
  let result = ''
  for (let i = 0; i < length; i++) {
    result += alphanumeric[(counter + i) % alphanumeric.length]
  }
  return result
})

export default nanoid
