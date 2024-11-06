import { createParser } from "eventsource-parser";
import { setAbortController } from "./abortController.mjs";

export async function* streamAsyncIterable(stream) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

// Definimos la URL base de tu API personalizada
export const fetchBaseUrl = (baseUrl) =>
    baseUrl || "https://1e45-186-87-10-38.ngrok-free.app/api/Query/processMessage";

// Ajustamos `fetchHeaders` para no incluir el encabezado de autorización
export const fetchHeaders = () => ({
  "Content-Type": "application/json",
});

// `fetchBody` mantiene el formato de mensaje requerido por la API
export const fetchBody = ({ messages = [] }) => ({
  message: messages[messages.length - 1]?.content || "",
});

export const fetchAction = async ({
                                    method = "POST",
                                    messages = [],
                                    options = {},
                                    signal,
                                  }) => {
  const url = fetchBaseUrl(options.baseUrl);
  const headers = fetchHeaders();
  const body = JSON.stringify(fetchBody({ messages }));

  // Log para ver qué mensaje se envía a la API
  console.log("Enviando mensaje a la API:", body);

  // Hacer la solicitud `fetch` sin encabezado de autorización
  const response = await fetch(url, {
    method,
    headers,
    body,
    signal,
  });

  // Procesamos la respuesta de la API y mostramos en consola
  let data;
  try {
    data = await response.text();  // Asumimos que la respuesta es un string
    console.log("Respuesta de la API:", data);
  } catch (error) {
    console.log("Error al analizar la respuesta de la API:", error);
    data = "Respuesta";  // Valor por defecto si ocurre un error
  }

  return { response: data };
};

export const fetchStream = async ({
                                    options,
                                    messages,
                                    onMessage,
                                    onEnd,
                                    onError,
                                    onStar,
                                  }) => {
  const { controller, signal } = setAbortController();
  let answer = "";

  // Utilizamos `fetchAction` para realizar la solicitud a la API
  const result = await fetchAction({ options, messages, signal }).catch(
      (error) => {
        onError && onError(error, controller);
      }
  );

  // Verificamos si la respuesta es válida antes de continuar
  if (!result) return;

  // Procesamos directamente la respuesta de la API como un string
  answer = result?.response || "";  // Aquí asumimos que `response` es un string

  // Log para verificar la respuesta procesada antes de enviarla al front-end
  console.log("Respuesta procesada para el front-end:", answer);

  if (answer) {
    // Enviar el mensaje completo de una vez
    onMessage && onMessage(answer, controller);
  }
  await onEnd();
};
