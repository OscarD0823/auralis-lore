# Audiolibros en Auralis Lore BETA

En Manuscrito, selecciona el diálogo, elige quién habla y pulsa **Marcar selección / párrafo**. Con el cursor dentro de un párrafo se marca ese párrafo completo. Narrador quita la marca. **Detectar «Nombre: diálogo»** reconoce los nombres y alias que ya existen en Personajes; no atribuye automáticamente diálogos ambiguos.

En **Audiolibro → Voces**, la opción predeterminada es neuronal. Hay 30 voces reales de modelos Piper para español, inglés, francés, portugués, alemán, italiano, neerlandés, polaco, ruso y ucraniano. **Daniela High** es el mismo modelo de voz utilizado por Fortuna Real en PC; el motor de inferencia de Lore es ONNX Runtime Web en un Worker. SHarvard aporta hablantes M0 y F1 para español. También se ofrecen Carlfm, Davefx, MLS 10246, MLS 9972 y Claude; el catálogo incluye nueve voces españolas. Se añaden seis hablantes reales del modelo neerlandés MLS sin duplicar sus pesos. Las voces de cada modelo son diferentes; no son las antiguas variantes de tono presentadas como actores. No se promete cubrir todos los idiomas ni conservar el mismo timbre al cambiar de idioma.

**Automático** detecta el idioma del capítulo y de fragmentos suficientemente largos; los diálogos cortos heredan el idioma principal. Puedes fijar el idioma del capítulo o del personaje cuando el texto es breve, mixto o ambiguo. Si el idioma identificado no tiene modelo, se muestra un aviso antes de generar. Una voz preferida cambia a una compatible cuando cambia el idioma; si no existe una voz del género preferido, se utiliza la disponible. No se traduce el texto.

Los proyectos anteriores se actualizan a voces neuronales al abrir el estudio por primera vez. Se conservan volumen, velocidad, marcas, tiempos y pistas. Las variantes clásicas permanecen como opción explícita de compatibilidad. En voces neuronales no se altera el tono artificialmente; la velocidad modifica la duración del modelo, no su frecuencia.

Cada modelo ocupa aproximadamente **20–109 MiB**. La web descarga el indicado al pulsar Escuchar o Descargar voz; aparece el progreso y el tamaño. Se comprueban tamaño y SHA-256 antes de guardarlo en IndexedDB. Solo se solicitan archivos públicos de modelos: el texto nunca se envía. Después funciona sin conexión si la aplicación y la voz están conservadas. La biblioteca permite eliminar modelos para liberar espacio; borrar datos del navegador puede eliminarlos. Los instaladores de esta versión incluyen Daniela y SHarvard; los demás modelos se descargan al elegirlos. La primera preparación tarda más y depende del dispositivo. Se mantiene una sesión de modelo activa para contener el consumo de memoria.

**Sonidos y música** contiene 254 efectos CC0 de Kenney y diez ambientes originales CC0 de Auralis. Los sonidos de naturaleza originales son procedurales. Importa también WAV, MP3, OGG, M4A, AAC, FLAC o WebM que tu dispositivo pueda decodificar, hasta 50 MB por archivo. Los audios propios se guardan en IndexedDB en este dispositivo, se reutilizan en otros proyectos y nunca se suben a un servidor. El guardado persistente depende del navegador; descargar una copia sigue siendo el respaldo portable.

En **Línea de tiempo** se editan pausas anteriores/posteriores, entrada ligada a un fragmento, retraso, recorte, duración, volumen, repetición y fundidos. Las duraciones son estimadas hasta generar la escucha y después se muestran las calculadas. Si cambias el texto de una entrada ligada, vuelve a seleccionar su fragmento; Lore avisa antes de mezclarla en un lugar equivocado.

Exporta WAV estéreo de 22.050 Hz por capítulo o un ZIP con los capítulos y el guion de tiempos. La BETA limita cada mezcla a 15 minutos y el ZIP a 200 MB para controlar la memoria. Puedes dividir capítulos más largos. La copia **.lore** conserva manuscrito, personajes, voces, tiempos y los archivos propios usados en las pistas; los proyectos antiguos JSON también abren. Los audios que no se usan en el proyecto permanecen en la biblioteca local y no se incluyen en su copia.

Las licencias originales de Piper Phonemize/eSpeak NG (MIT/GPL-3.0), ONNX Runtime (MIT), meSpeak/eSpeak (GPL-3.0) y Kenney (CC0-1.0) se conservan en el núcleo común, junto con las fuentes y archivos originales. Autor de la interfaz, marcas de diálogo, modelos, mezcla y ambientes originales: OscarD0823.

Las fichas y las licencias particulares de los datos de cada modelo se conservan en vendor/lore-neural. Se excluyeron modelos con licencia de datos NC o sin determinar. Los WAV incluyen créditos en metadatos RIFF INFO y el ZIP incluye Creditos de voces.txt. No se modifican los pesos originales ni se atribuyen los modelos a Auralis.

Para reconstruir paquetes con voces españolas integradas: ejecuta node scripts/download-lore-voices.mjs; define ASTEORIA_BUNDLED_VOICES con la ruta absoluta de .prisma/voices antes de compilar Lore o Auralis. Una compilación sin esa variable descarga las voces durante el uso.
# Uso sin internet

En Audiolibro, pulsa **Preparar audiolibro sin conexión** antes de desconectarte.
Se prepara la aplicación web, el motor, los efectos y las voces que utilizan todos
los capítulos y personajes. La preparación comprueba una generación de cada modelo.
«Más idiomas y voces sin conexión → Descargar todas las voces» conserva la biblioteca
completa, con el tamaño total indicado antes de descargar. Después permite cambiar
entre los diez idiomas disponibles y sus voces sin descargar otros modelos.
En Windows y Android, Daniela y SHarvard ya se incluyen; otras voces se descargan
una vez y se verifican antes de guardarse. Una voz nueva o un idioma distinto puede
necesitar otra preparación. Las voces no se sustituyen por síntesis clásica ante
un fallo: se muestra el recurso pendiente. El navegador puede eliminar datos si
se borran sus archivos o falta almacenamiento; conserva copias de tus historias.

