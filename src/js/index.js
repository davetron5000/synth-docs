class HomescreenNotification extends HTMLElement {

  #dismiss

  constructor() {
    super()
    this.style.display = "none"
    this.#dismiss = (event) => {
      event.preventDefault()
      this.style.display = "none"
      if (window.localStorage) {
        window.localStorage.setItem("seenHomeScreenMessage","true")
      }
    }
  }

  connectedCallback() {
    this.#render()
  }

  #render() {
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
class PWADetection extends HTMLElement {
  connectedCallback() {
    this.#render()
  }

  #render() {
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

class ReloadPage extends HTMLElement {

  #reloadPage

  constructor() {
    super()
    this.#reloadPage = (event) => {
      event.preventDefault()
      window.location.reload()
    }
  }
  connectedCallback() {
    this.querySelector("button").addEventListener("click", this.#reloadPage)
  }
}

document.addEventListener("DOMContentLoaded", () => {
  customElements.define("synth-homescreen-notification",HomescreenNotification)
  customElements.define("synth-pwa-detection",PWADetection)
  customElements.define("synth-reload",ReloadPage)
})
