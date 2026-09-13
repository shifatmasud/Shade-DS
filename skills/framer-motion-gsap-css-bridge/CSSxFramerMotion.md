import { spring } from "motion"

//You can set transition on an element at runtime, before changing its other values.

const element = document.querySelector("button")

element.style.transition = "transform " + spring(0.3)
element.style.transform = "scale(1.2)"