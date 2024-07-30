class BaseCustomElement extends HTMLElement {

  #domLoaded
  #onDOMLoaded

  constructor() {
    super()
    this.#domLoaded = false
    this.#onDOMLoaded = () => {
      this.#domLoaded = true
      this.#_render()
    }
  }

  connectedCallback() {
    document.addEventListener("DOMContentLoaded", this.#onDOMLoaded)
    if (this.onConnected) {
      this.onConnected()
    }
    this.#_render()
  }

  #_render() {
    if (!this.#domLoaded) {
      return
    }
    if (this.render)  {
      this.render()
    }
  }
}

class HomescreenNotification extends BaseCustomElement {

  #dismiss

  constructor() {
    super()
        window.localStorage.removeItem("seenHomeScreenMessage")
    this.#dismiss = (event) => {
      event.preventDefault()
      this.style.display = "none"
      if (window.localStorage) {
        window.localStorage.setItem("seenHomeScreenMessage","true")
      }
    }
  }

  onConnected() {
    this.style.display = "none"
  }

  render() {
    const button = this.querySelector("button")

    const isAddedToHomeScreen = window.matchMedia("(display-mode: standalone)").matches
    const isLikelyMobile      = window.matchMedia("(max-width: 30em)").matches
    const seenMessage         = window.localStorage && 
                                window.localStorage.getItem("seenHomeScreenMessage") == "true"

    const showHomeScreenMessage = (!seenMessage && isLikelyMobile && !isAddedToHomeScreen)

    if (showHomeScreenMessage) {
      this.style.display = "block"
    }

    button.addEventListener("click",this.#dismiss)
  }
}

class PWADetection extends BaseCustomElement {

  render() {
    const isAddedToHomeScreen = window.matchMedia("(display-mode: standalone)").matches
    this.querySelectorAll("[data-if-not-pwa]").forEach( (element) => {
      if (isAddedToHomeScreen) {
        element.style.display = "none"
      }
      else {
        element.style.display = "block"
      }
    })
    this.querySelectorAll("[data-if-pwa]").forEach( (element) => {
      if (isAddedToHomeScreen) {
        element.style.display = "block"
      }
      else {
        element.style.display = "none"
      }
    })

  }
}

class ReloadPage extends BaseCustomElement {

  #reloadPage

  constructor() {
    super()
    this.#reloadPage = (event) => {
      event.preventDefault()
      window.location.reload()
    }
  }
  render() {
    this.querySelector("button").addEventListener("click", this.#reloadPage)
  }
}

class BPMCalc extends BaseCustomElement {
  #updateCalculations
  #submitForm

  constructor() {
    super()
    this.#submitForm = (event) => {
      event.preventDefault()
      const input = event.currentTarget.querySelector("input[name=bpm]")
      if (input) {
        this.#calculate(input.value)
      }
    }
    this.#updateCalculations = (event) => {
      if (event.currentTarget.value) {
        this.#calculate(event.currentTarget.value)
      }
      else {
        this.#clearAll()
      }
    }
  }

  render() {
    const input = this.querySelector("input[name=bpm]")
    if (input) {
      if (input.value) {
        this.#calculate(input.value)
      }
      else {
        this.#clearAll()
      }
      input.addEventListener("input", this.#updateCalculations)
      input.focus()
    }
    else {
      this.#clearAll()
    }
    const form = this.querySelector("form")
    if (form) {
      form.addEventListener("submit", this.#submitForm)
      form.querySelectorAll("input[type=submit]").forEach( (element) => {
        element.style.display = "none"
      })
    }
  }

  #calculate(value) {
    const bpm = Number(value)
    if (isNaN(bpm)) {
      this.#clearAll()
      return
    }
    this.querySelectorAll("[data-note]").forEach( (element) => {
      const divisor = Number(element.dataset.note)
      if (!isNaN(divisor)) {
        const ms = (60000 / bpm) / divisor
        element.textContent = ms.toLocaleString(undefined,{ minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: false })
      }
      else {
        console.warn("%o's data-note was not a number: %s",element,element.dataset.note)
      }
    })
  }

  #clearAll() {
    this.querySelectorAll("[data-note]").forEach( (element) => {
      element.textContent = ""
    })
  }
}


customElements.define("synth-homescreen-notification",HomescreenNotification)
customElements.define("synth-pwa-detection",PWADetection)
customElements.define("synth-reload",ReloadPage)
customElements.define("synth-bpm-calc",BPMCalc)
