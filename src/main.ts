import "./style.css"
import $ from "jquery"
import * as tf from "@tensorflow/tfjs"

let model: tf.LayersModel | null = null

const loadModel = async () => {
  $("#loading").fadeIn(200)
  model = await tf.loadLayersModel("model/model.json")
  $("#loading").fadeOut(200)
}

window.onload = loadModel

const canvasDraw = document.querySelector("canvas#draw") as HTMLCanvasElement
const ctxDraw = canvasDraw.getContext("2d", {
  willReadFrequently: true
}) as CanvasRenderingContext2D

type Stroke = { prevX: number; prevY: number; x: number; y: number }
class Node {
  public readonly _children: Stroke[]
  private _next: Node | null
  private _prev: Node | null
  constructor() {
    this._children = []
    this._next = null
    this._prev = null
  }
  add(stroke: Stroke) {
    this._children.push(stroke)
  }
  get children(): Stroke[] {
    return this._children
  }
  set next(node: Node | null) {
    this._next = node
  }
  get next(): Node | null {
    return this._next ?? null
  }
  set prev(node: Node | null) {
    this._prev = node
  }
  get prev(): Node | null {
    return this._prev ?? null
  }
}

class DoublyLinkedList {
  private _head: Node | null
  private _tail: Node | null
  constructor() {
    this._head = null
    this._tail = null
  }
  get head(): Node | null {
    return this._head
  }
  get tail(): Node | null {
    return this._tail
  }
  add(node: Node) {
    if (!this._head) {
      this._head = node
      this._tail = node
      return
    }
    if (!this._tail) return
    if (!this._head) return
    this._tail.next = node
    node.prev = this._tail
    this._tail = node
  }
  popHead() {
    if (!this._tail) return
    if (!this._head) return
    if (this._head == this._tail) {
      this._head = null
      this._tail = null
      return
    }
    this._head = this._head.next
    if (!this._head) return
    if (!this._head.prev) return
    this._head.prev = null
  }
  clear() {
    this._head = null
    this._tail = null
    currentPredictions = null
  }
}

const allStrokes = new DoublyLinkedList()
let currentStroke = new Node()

let isDrawing = false

let prevX: null | number = null
let prevY: null | number = null

const cancel = () => {
  prevX = null
  prevY = null
}

const draw = (x: number, y: number) => {
  if (!prevX || !prevY) {
    prevX = x
    prevY = y
  }

  currentStroke.add({ prevX, prevY, x, y })

  prevX = x
  prevY = y
  getCurrentStroke()
}

// On ctrl + z
$(window).on("keydown", (e) => {
  if (e.ctrlKey && e.key == "z") {
    allStrokes.popHead()
  }
})

$(window).on("mouseup", () => {
  isDrawing = false

  allStrokes.add(currentStroke)
  currentStroke = new Node()

  cancel()
})

$(canvasDraw).on("mouseleave", () => {
  cancel()
})

$(canvasDraw).on("mousedown", (e) => {
  isDrawing = true
  const { clientX, clientY } = e
  const { left, top } = canvasDraw.getBoundingClientRect()
  const x = clientX - left
  const y = clientY - top
  draw(x, y)
})

$(canvasDraw).on("mousemove", (e) => {
  if (!isDrawing) return
  const { clientX, clientY } = e
  const { left, top } = canvasDraw.getBoundingClientRect()
  const x = clientX - left
  const y = clientY - top
  draw(x, y)
})

$(canvasDraw).on("touchstart", (e) => {
  isDrawing = true
  const { clientX, clientY } = e.touches[0]
  const { left, top } = canvasDraw.getBoundingClientRect()
  const x = clientX - left
  const y = clientY - top
  draw(x, y)
})

$(canvasDraw).on("touchmove", (e) => {
  if (!isDrawing) return
  const { clientX, clientY } = e.touches[0]
  const { left, top } = canvasDraw.getBoundingClientRect()
  const x = clientX - left
  const y = clientY - top
  draw(x, y)
})

$(window).on("touchend", () => {
  isDrawing = false

  allStrokes.add(currentStroke)
  currentStroke = new Node()

  cancel()
})

$(window).on("touchleave", () => {
  cancel()
})

$("button#clr").on("click", () => {
  allStrokes.clear()
  currentStroke = new Node()
})

let prevTotal: null | number = null

let paramLineWidth = 2
$("input#width").on("input", (e) => {
  const { value } = e.target as HTMLInputElement
  paramLineWidth = Number(value)
})

const applyDrawCanvas = ({ x, y, prevX, prevY }: Stroke) => {
  ctxDraw.beginPath()
  ctxDraw.moveTo(prevX, prevY)
  ctxDraw.lineTo(x, y)
  ctxDraw.strokeStyle = "#fff"
  ctxDraw.lineWidth = paramLineWidth
  ctxDraw.stroke()
  ctxDraw.closePath()
}

let currentPredictions: { [key: number]: number } | null = null

const updateAIInfo = () => {
  $("#ai > ul").empty()
  if (!currentPredictions) {
    for (let i = 0; i < 10; i++) {
      const elem = $.parseHTML(`<li><span>${i}</span>?</li>`)
      $("#ai > ul").append(elem)
    }
  } else {
    const bestPredition = Math.max(...Object.values(currentPredictions))
    for (let i = 0; i < 10; i++) {
      const elem = $.parseHTML(
        `<li><span>${i}</span>${Math.round(currentPredictions[i])}%</li>`
      )
      if (currentPredictions[i] == bestPredition) $(elem).addClass("best")
      $(elem)
        .find("span")
        .css("opacity", (currentPredictions[i] / 100) * 5)
      $("#ai > ul").append(elem)
    }
  }
}

const getCurrentStroke = () => {
  if (!prevTotal || !model) return
  const data = ctxDraw.getImageData(
    0,
    0,
    canvasDraw.width,
    canvasDraw.height
  ).data
  const input = []
  for (let y = 0; y < canvasDraw.height; y += prevTotal) {
    for (let x = 0; x < canvasDraw.width; x += prevTotal) {
      const index = (y * canvasDraw.width + x) * 4
      const { r, g, b } = {
        r: data[index],
        g: data[index + 1],
        b: data[index + 2]
      }
      input.push((r + g + b) / 3 / 255)
    }
  }
  // Create variable for model.predict
  const inputTensor = tf.tensor(input, [1, 12600])
  const outputTensor = model.predict(inputTensor) as tf.Tensor
  const outputData = outputTensor.dataSync()
  // Update current predictions
  if (!currentPredictions) currentPredictions = {}
  for (let i = 0; i < 10; i++) {
    currentPredictions[i] = outputData[i] * 100
  }
}

const update = () => {
  const totalWidth = window.innerWidth / 90
  const totalHeight = window.innerHeight / 140
  const total = Math.floor(Math.min(totalWidth, totalHeight) - 1)
  if (total != prevTotal) {
    canvasDraw.width = total * 90
    canvasDraw.height = total * 140
    prevTotal = total
  }
  ctxDraw.fillStyle = "#000"
  ctxDraw.fillRect(0, 0, canvasDraw.width, canvasDraw.height)
  const { children } = currentStroke
  for (const child of children) {
    applyDrawCanvas(child)
  }
  let currentNode = allStrokes.head
  while (currentNode) {
    const { children } = currentNode
    for (const child of children) {
      applyDrawCanvas(child)
    }
    currentNode = currentNode.next
  }

  updateAIInfo()
  requestAnimationFrame(update)
}

update()
