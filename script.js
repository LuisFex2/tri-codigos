// Variables globales
let isLoading = false
let currentPlatform = "netflix" // Added current platform tracking

// Elementos del DOM
const phoneForm = document.getElementById("phoneForm")
const phoneNumber = document.getElementById("phoneNumber")
const countryCode = document.getElementById("countryCode")
const submitBtn = document.getElementById("submitBtn")
const loading = document.getElementById("loading")
const errorMessage = document.getElementById("errorMessage")
const verificationSection = document.getElementById("verificationSection")
const premiumContent = document.getElementById("premiumContent")
const clientName = document.getElementById("clientName")
const emailInput = document.getElementById("emailInput")
const emailButton = document.querySelector(".netflix-form button")
const emailError = document.getElementById("emailError")
const whatsappContainer = document.getElementById("whatsappContainer")
const whatsappButton = document.getElementById("whatsappButton")

const tabButtons = document.querySelectorAll(".tab-btn")
const platformContents = document.querySelectorAll(".platform-content")

// Funciones auxiliares
function hideEmailError() {
  emailError.style.display = "none"
}

function showEmailError(message) {
  emailError.style.display = "block"
  emailError.querySelector("strong").textContent = "❌ " + message
}

function showWhatsAppButton(email, apiMessage) {
  console.log("[v0] showWhatsAppButton llamada con:", email, apiMessage)
  hideEmailError()

  console.log("[v0] whatsappContainer encontrado:", whatsappContainer)
  console.log("[v0] whatsappButton encontrado:", whatsappButton)

  if (whatsappContainer && whatsappButton) {
    console.log("[v0] Mostrando botón de WhatsApp")
    whatsappContainer.style.display = "block"

    // Update the click handler
    whatsappButton.onclick = () => {
      console.log("[v0] Botón de WhatsApp clickeado")
      openWhatsApp(email, apiMessage)
    }
  } else {
    console.error("[v0] No se encontraron los elementos de WhatsApp")
  }
}

function switchPlatform(platform) {
  currentPlatform = platform

  // Update tab buttons
  tabButtons.forEach((btn) => {
    btn.classList.remove("active")
    if (btn.dataset.platform === platform) {
      btn.classList.add("active")
    }
  })

  // Update platform content
  platformContents.forEach((content) => {
    content.classList.remove("active")
    if (content.id === `${platform}-content`) {
      content.classList.add("active")
    }
  })

  // Reset any active forms in the new platform
  resetPlatformForms(platform)
}

function resetPlatformForms(platform) {
  // Hide any error messages and WhatsApp buttons for the current platform
  const platformContent = document.getElementById(`${platform}-content`)
  if (platformContent) {
    const errorElements = platformContent.querySelectorAll(".error-message")
    const whatsappContainers = platformContent.querySelectorAll('[id*="WhatsappContainer"]')

    errorElements.forEach((el) => (el.style.display = "none"))
    whatsappContainers.forEach((el) => (el.style.display = "none"))
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  phoneForm.addEventListener("submit", handleSubmit)

  if (emailButton) {
    emailButton.addEventListener("click", () => showEmailDemo("netflix"))
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const platform = btn.dataset.platform
      switchPlatform(platform)
    })
  })

  const disneyButton = document.querySelector(".disney-form button")
  const amazonButton = document.querySelector(".amazon-form button")

  if (disneyButton) {
    disneyButton.addEventListener("click", () => showEmailDemo("disney"))
  }

  if (amazonButton) {
    amazonButton.addEventListener("click", () => showEmailDemo("amazon"))
  }

  // Limpiar mensajes cuando el usuario empiece a escribir
  phoneNumber.addEventListener("input", () => {
    hideMessages()
  })
})

async function handleSubmit(e) {
  e.preventDefault()

  if (isLoading) return

  const phone = phoneNumber.value.trim()
  const country = countryCode.value

  if (!phone) {
    showError("Por favor ingresa tu número de teléfono")
    return
  }

  // Mostrar loading
  showLoading()

  try {
    // Construir el número completo
    const fullPhone = country.replace("+", "") + phone

    console.log("[v0] Verificando número:", fullPhone)

    const response = await fetchWithTimeout(
      `https://script.google.com/macros/s/AKfycbyZIvkn6W0kXBzEVdroLWD09CZKxvegvylkB1_mlXpHkJoeCj8sBM5QhA28WoOviARe/exec?telefono=${fullPhone}`,
      10000,
    )

    if (!response.ok) {
      throw new Error("Error en la respuesta del servidor")
    }

    const data = await response.json()
    console.log("[v0] Respuesta de la API:", data)

    const foundClient = findClientOptimized(data, fullPhone)

    hideLoading()

    if (foundClient) {
      console.log("[v0] Cliente encontrado:", foundClient.Cliente)
      showPremiumContent(foundClient.Cliente)
    } else {
      console.log("[v0] Cliente no encontrado")
      showError("Número no encontrado. No tienes acceso al contenido premium.")
    }
  } catch (error) {
    console.error("[v0] Error en la verificación:", error)
    hideLoading()

    if (error.name === "TimeoutError") {
      showError("La verificación está tardando más de 10 segundos. Inténtalo de nuevo.")
    } else {
      showError("Error al verificar el número. Inténtalo de nuevo.")
    }
  }
}

async function fetchWithTimeout(url, timeout = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-cache", // Evitar cache para datos actualizados
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === "AbortError") {
      const timeoutError = new Error("Request timeout")
      timeoutError.name = "TimeoutError"
      throw timeoutError
    }
    throw error
  }
}

function findClientOptimized(data, fullPhone) {
  if (Array.isArray(data)) {
    // Búsqueda optimizada en array
    for (let i = 0; i < data.length; i++) {
      const client = data[i]
      if (client.Telefono) {
        const clientPhone = client.Telefono.toString().replace(/\+/g, "")
        if (clientPhone === fullPhone) {
          return client
        }
      }
    }
    return null
  } else if (data.Cliente && data.Telefono) {
    // Si la respuesta es un objeto único
    const clientPhone = data.Telefono.toString().replace(/\+/g, "")
    return clientPhone === fullPhone ? data : null
  }
  return null
}

function showLoading() {
  isLoading = true
  loading.style.display = "block"
  submitBtn.disabled = true
  submitBtn.textContent = "Verificando..."
  hideError()

  submitBtn.style.opacity = "0.7"
}

function hideLoading() {
  isLoading = false
  loading.style.display = "none"
  submitBtn.disabled = false
  submitBtn.textContent = "Verificar Acceso"
  submitBtn.style.opacity = "1"
}

function showError(message) {
  errorMessage.style.display = "block"
  errorMessage.querySelector("strong").textContent = "❌ " + message
}

function hideError() {
  errorMessage.style.display = "none"
}

function hideMessages() {
  hideError()
  hideLoading()
  hidePlatformEmailError(document.getElementById("emailError"))
  hidePlatformEmailError(document.getElementById("disneyEmailError"))
  hidePlatformEmailError(document.getElementById("amazonEmailError"))
}

function showPremiumContent(cliente) {
  // Ocultar sección de verificación
  verificationSection.style.display = "none"

  // Mostrar contenido premium
  premiumContent.style.display = "block"
  clientName.textContent = cliente

  switchPlatform("netflix")

  // Scroll al contenido premium
  premiumContent.scrollIntoView({ behavior: "smooth" })
}

async function showEmailDemo(platform = "netflix") {
  let emailInput, emailButton, emailError, whatsappContainer, whatsappButton, apiUrl

  // Get platform-specific elements
  if (platform === "disney") {
    emailInput = document.getElementById("disneyEmailInput")
    emailButton = document.querySelector(".disney-form button")
    emailError = document.getElementById("disneyEmailError")
    whatsappContainer = document.getElementById("disneyWhatsappContainer")
    whatsappButton = document.getElementById("disneyWhatsappButton")
    // You'll need to provide Disney API URL
    apiUrl = `https://script.google.com/macros/s/YOUR_DISNEY_API_ID/exec?email=`
  } else if (platform === "amazon") {
    emailInput = document.getElementById("amazonEmailInput")
    emailButton = document.querySelector(".amazon-form button")
    emailError = document.getElementById("amazonEmailError")
    whatsappContainer = document.getElementById("amazonWhatsappContainer")
    whatsappButton = document.getElementById("amazonWhatsappButton")
    // You'll need to provide Amazon API URL
    apiUrl = `https://script.google.com/macros/s/YOUR_AMAZON_API_ID/exec?email=`
  } else {
    // Netflix (default)
    emailInput = document.getElementById("emailInput")
    emailButton = document.querySelector(".netflix-form button")
    emailError = document.getElementById("emailError")
    whatsappContainer = document.getElementById("whatsappContainer")
    whatsappButton = document.getElementById("whatsappButton")
    apiUrl = `https://script.google.com/macros/s/AKfycbw1vpPONFAgRxOV835iDKVXLVf06-ljvuYQtfWOs358jXQneOFLuXfmD7WbwCwmf0_4bQ/exec?email=`
  }

  const email = emailInput.value.trim()

  if (!email) {
    showPlatformEmailError(emailError, "Por favor ingresa un correo electrónico")
    return
  }

  // Mostrar loading en el botón de email
  emailButton.disabled = true
  emailButton.textContent = "Verificando..."
  emailButton.style.opacity = "0.7"
  hidePlatformEmailError(emailError)

  try {
    console.log(`[v0] Verificando correo ${platform}:`, email)

    const fullApiUrl = apiUrl + encodeURIComponent(email)
    console.log(`[v0] URL de la API de ${platform}:`, fullApiUrl)

    const response = await fetchWithTimeout(fullApiUrl, 10000)

    console.log("[v0] Status de respuesta:", response.status)

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`)
    }

    const responseText = await response.text()
    console.log(`[v0] Respuesta cruda de la API ${platform}:`, responseText)

    let data
    try {
      data = JSON.parse(responseText)
      console.log(`[v0] Respuesta parseada de la API de ${platform}:`, data)
    } catch (parseError) {
      console.error("[v0] Error al parsear JSON:", parseError)
      throw new Error("La respuesta del servidor no es JSON válido")
    }

    // Restaurar botón
    emailButton.disabled = false
    emailButton.textContent = "Enviar"
    emailButton.style.opacity = "1"

    if (data.success === false) {
      console.log(`[v0] API ${platform} devolvió error:`, data.message)
      showPlatformEmailError(
        emailError,
        data.message || `No se encontraron correos de ${platform.toUpperCase()} para el destinatario especificado.`,
      )
    } else if (data.success === true) {
      console.log(`[v0] API ${platform} devolvió éxito, creando botón de WhatsApp`)
      showPlatformWhatsAppButton(whatsappContainer, whatsappButton, email, data.message, emailError)
    } else {
      console.log(`[v0] Respuesta inesperada de ${platform}:`, data)
      showPlatformEmailError(emailError, "Respuesta inesperada del servidor")
    }
  } catch (error) {
    console.error(`[v0] Error en la verificación de correo ${platform}:`, error)

    // Restaurar botón
    emailButton.disabled = false
    emailButton.textContent = "Enviar"
    emailButton.style.opacity = "1"

    if (error.name === "TimeoutError") {
      showPlatformEmailError(emailError, "La verificación está tardando más de 10 segundos. Inténtalo de nuevo.")
    } else {
      showPlatformEmailError(emailError, `Error al verificar el correo: ${error.message}`)
    }
  }
}

function hidePlatformEmailError(emailError) {
  if (emailError) {
    emailError.style.display = "none"
  }
}

function showPlatformEmailError(emailError, message) {
  if (emailError) {
    emailError.style.display = "block"
    emailError.querySelector("strong").textContent = "❌ " + message
  }
}

function showPlatformWhatsAppButton(whatsappContainer, whatsappButton, email, apiMessage, emailError) {
  console.log("[v0] showPlatformWhatsAppButton llamada con:", email, apiMessage)
  hidePlatformEmailError(emailError)

  if (whatsappContainer && whatsappButton) {
    console.log("[v0] Mostrando botón de WhatsApp de plataforma")
    whatsappContainer.style.display = "block"

    whatsappButton.onclick = () => {
      console.log("[v0] Botón de WhatsApp de plataforma clickeado")
      openWhatsApp(email, apiMessage)
    }
  } else {
    console.error("[v0] No se encontraron los elementos de WhatsApp de la plataforma")
  }
}

function openWhatsApp(email, apiMessage) {
  // Obtener el número de teléfono del cliente que ingresó inicialmente
  const clientPhone = phoneNumber.value.trim()
  const country = countryCode.value
  const fullClientPhone = country + clientPhone

  // Mensaje completo de la API para enviar por WhatsApp
  const whatsappMessage = `${apiMessage}`

  // URL de WhatsApp con el número del cliente y el mensaje completo
  const whatsappUrl = `https://wa.me/${fullClientPhone.replace("+", "")}?text=${encodeURIComponent(whatsappMessage)}`

  // Abrir WhatsApp en nueva ventana
  window.open(whatsappUrl, "_blank")
}

// Función para limpiar el formulario
function resetForm() {
  phoneNumber.value = ""

  const emailInputs = document.querySelectorAll('[id*="EmailInput"]')
  emailInputs.forEach((input) => (input.value = ""))

  hideMessages()
  premiumContent.style.display = "none"
  verificationSection.style.display = "block"
}
