const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const headStyleAddition = `
      /* =====================================================
         MOBILE / SHORT-VIEWPORT FIT FIX (all overlay screens)
         The bundled React app uses huge Tailwind text-7xl /
         text-9xl titles inside fullscreen overlay containers
         (main menu, death screen "EXTINGUISHED", win screen
         "TRANSCENDENCE", story/dialogue overlays, skill tree
         "Constellation of Virtues"). On landscape phones and
         short viewports these titles overflow the top and
         action buttons (INITIALIZE / RE-IGNITE / NEW CYCLE)
         get pushed below the fold. These rules scale the
         overlays down and allow safe overflow scrolling
         without touching the bundled JS.

         Target selectors cover BOTH \`absolute inset-0\` and
         \`fixed inset-0\` fullscreen overlays regardless of
         their z-index (z-50, z-[100], z-[200], ...) so every
         menu / result / dialogue scene is fixed, not just
         the main menu.
         ===================================================== */

      /* Allow every fullscreen overlay to scroll vertically
         as a safety net if it ever overflows. Applies to both
         \`absolute inset-0\` and \`fixed inset-0\` containers. */
      .absolute.inset-0.z-50,
      .fixed.inset-0[class*="z-[100]"],
      .fixed.inset-0[class*="z-[110]"],
      .fixed.inset-0[class*="z-[200]"] {
        overflow-y: auto !important;
        overflow-x: hidden !important;
        -webkit-overflow-scrolling: touch;
      }

      /* Short viewports (landscape phones, small windows).
         Roughly: any device where the visible height is 600px or
         less. Shrink huge titles and tighten vertical rhythm so
         each overlay fits on-screen. */
      @media (max-height: 600px) {
        /* Any big title (text-7xl / text-9xl) inside any overlay:
           LIGHT, EXTINGUISHED, TRANSCENDENCE, VOID, etc. */
        .absolute.inset-0 h1.text-7xl,
        .absolute.inset-0 h1.md\\:text-9xl,
        .fixed.inset-0 h1.text-7xl,
        .fixed.inset-0 h1.md\\:text-9xl {
          font-size: 2.75rem !important;   /* ~44px */
          line-height: 1 !important;
        }
        /* VOID / smaller headline (text-6xl md:text-9xl). */
        .absolute.inset-0 h1.text-6xl,
        .absolute.inset-0 h1.text-6xl.md\\:text-9xl,
        .fixed.inset-0 h1.text-6xl,
        .fixed.inset-0 h1.text-6xl.md\\:text-9xl {
          font-size: 2.5rem !important;    /* ~40px */
          line-height: 1 !important;
        }
        /* Story / dialogue text (text-3xl md:text-5xl). */
        .fixed.inset-0 .text-3xl.md\\:text-5xl {
          font-size: 1.25rem !important;
          line-height: 1.3 !important;
        }
        /* Death-screen quote (text-xl md:text-2xl). */
        .absolute.inset-0 .text-xl.md\\:text-2xl {
          font-size: 0.95rem !important;
          line-height: 1.3 !important;
        }
        /* Tighten big vertical margins/paddings inside overlays. */
        .absolute.inset-0.z-50 .mb-12,
        .fixed.inset-0 .mb-12 {
          margin-bottom: 1rem !important;
        }
        .absolute.inset-0.z-50 .mb-8,
        .fixed.inset-0 .mb-8 {
          margin-bottom: 0.75rem !important;
        }
        .absolute.inset-0.z-50 .mb-4 {
          margin-bottom: 0.5rem !important;
        }
        .absolute.inset-0.z-50 .mt-8 {
          margin-top: 1rem !important;
        }
        /* Compact primary action buttons (INITIALIZE, RE-IGNITE, NEW CYCLE). */
        .absolute.inset-0.z-50 button.py-5,
        .fixed.inset-0 button.py-5 {
          padding-top: 0.75rem !important;
          padding-bottom: 0.75rem !important;
          font-size: 1rem !important;
        }
        .absolute.inset-0.z-50 button.py-4,
        .fixed.inset-0 button.py-4 {
          padding-top: 0.6rem !important;
          padding-bottom: 0.6rem !important;
          font-size: 0.95rem !important;
        }
        /* Reduce outer padding on flex overlays so content anchors
           to top and the whole screen fits without clipping. */
        .absolute.inset-0.z-50.p-4,
        .absolute.inset-0.z-50.flex.flex-col.items-center.justify-center {
          padding: 0.5rem !important;
          justify-content: flex-start !important;
          padding-top: 3.5rem !important;  /* clear top-corner icons */
        }
        /* Death-screen respawn card: shrink padding so it fits. */
        .absolute.inset-0 .max-w-md.p-6 {
          padding: 0.75rem !important;
        }
      }

      /* Extra-short viewports (very small landscape phones). */
      @media (max-height: 450px) {
        .absolute.inset-0 h1.text-7xl,
        .absolute.inset-0 h1.md\\:text-9xl,
        .fixed.inset-0 h1.text-7xl,
        .fixed.inset-0 h1.md\\:text-9xl {
          font-size: 2rem !important;      /* ~32px */
        }
        .absolute.inset-0 h1.text-6xl,
        .absolute.inset-0 h1.text-6xl.md\\:text-9xl,
        .fixed.inset-0 h1.text-6xl,
        .fixed.inset-0 h1.text-6xl.md\\:text-9xl {
          font-size: 1.75rem !important;
        }
        .absolute.inset-0.z-50 .mb-12,
        .fixed.inset-0 .mb-12 {
          margin-bottom: 0.5rem !important;
        }
        .absolute.inset-0.z-50 .mb-8,
        .fixed.inset-0 .mb-8 {
          margin-bottom: 0.4rem !important;
        }
        .absolute.inset-0.z-50 button.py-5,
        .fixed.inset-0 button.py-5,
        .absolute.inset-0.z-50 button.py-4,
        .fixed.inset-0 button.py-4 {
          padding-top: 0.5rem !important;
          padding-bottom: 0.5rem !important;
          font-size: 0.9rem !important;
        }
        .fixed.inset-0 .text-3xl.md\\:text-5xl {
          font-size: 1.05rem !important;
        }
      }

      /* Narrow portrait phones: same idea, keyed on width.
         Prevents titles from overflowing horizontally too. */
      @media (max-width: 480px) {
        .absolute.inset-0 h1.text-7xl,
        .fixed.inset-0 h1.text-7xl {
          font-size: 3.5rem !important;
        }
        .absolute.inset-0 h1.text-6xl,
        .fixed.inset-0 h1.text-6xl {
          font-size: 3rem !important;
        }
        /* On narrow screens the death-screen respawn card and
           main-menu block can overflow horizontally with big padding. */
        .absolute.inset-0 .max-w-md {
          max-width: 100% !important;
        }
        .absolute.inset-0 .max-w-2xl {
          max-width: 100% !important;
        }
        /* Constellation of Virtues (skill tree) top-left title
           overlaps content on narrow screens - shrink it. */
        .absolute.inset-0.bg-slate-950\\/95 h1.text-4xl {
          font-size: 1.5rem !important;
        }
      }
`;

const bodyEndAddition = `
<script>
(function() {
  // ===== Light Rogue Void — Language / Translation Layer =====
  // Adds Spanish translation with a runtime toggle in the SYSTEM SETTINGS panel.
  // English is the default. This runs BEFORE the React bundle mounts and
  // uses a MutationObserver to translate DOM text nodes as React renders.

  var STORAGE_KEY = 'lrv_lang';
  var lang;
  try { lang = localStorage.getItem(STORAGE_KEY) || 'en'; } catch (e) { lang = 'en'; }
  if (lang !== 'es' && lang !== 'en') lang = 'en';

  // Dictionary: English -> Spanish. Length-sorted so composite strings match longer phrases first.
  var ENTRIES = [
    ['If you have any feedback or just want to say hi, please feel free to reach out to me at:','Si tienes comentarios o solo quieres saludar, no dudes en contactarme en:'],
    ['A chaotic construct that ricochets around the arena, leaving toxic nebulas in its wake.','Un constructo caótico que rebota por la arena, dejando nebulosas tóxicas a su paso.'],
    ['Releases a gravitational wave that pushes enemies back violently (11s Cooldown).','Libera una onda gravitatoria que empuja violentamente a los enemigos (Enfriamiento 11s).'],
    ['Save failed - likely restricted environment (itch.io/private window):','Guardado fallido - probablemente entorno restringido (itch.io/ventana privada):'],
    ['A dying star with intense gravitational pull that distorts space.','Una estrella moribunda con intensa atracción gravitatoria que distorsiona el espacio.'],
    ['Drops a black hole mine that pulls enemies in, then explodes.','Deja una mina de agujero negro que atrae enemigos y luego explota.'],
    ['The universe was cold before you, and it will be cold after.','El universo era frío antes de ti, y lo será después.'],
    ['Throws boomerang blades of light that spiral out and return.','Lanza hojas bumerán de luz que giran hacia afuera y regresan.'],
    ['Adjusts background star density. Use LOW for older devices.','Ajusta la densidad de estrellas de fondo. Usa BAJO en dispositivos antiguos.'],
    ['The end of all things. A consuming void that devours light.','El fin de todas las cosas. Un vacío consumidor que devora la luz.'],
    ['A pulsating organic mass that spawns swarms and spits acid.','Una masa orgánica pulsante que engendra enjambres y escupe ácido.'],
    ['Creates a temporary barrier of light that repels darkness.','Crea una barrera temporal de luz que repele la oscuridad.'],
    ['Dash creates a massive white explosion at the start point.','El esquive crea una enorme explosión blanca en el punto de inicio.'],
    ['Summons loyal lights that orbit you and intercept enemies.','Invoca luces leales que te orbitan e interceptan enemigos.'],
    ['Even the brightest star is but a delay of the inevitable.','Incluso la estrella más brillante es solo un retraso de lo inevitable.'],
    ['A corrupted star that burns everything with solar lasers.','Una estrella corrupta que quema todo con láseres solares.'],
    ['Strikes nearby enemies with a whip of pure golden light.','Golpea a enemigos cercanos con un látigo de pura luz dorada.'],
    ['Complete the game (Wave 60) without dying (Start Wave 1)','Completa el juego (Oleada 60) sin morir (empezando en la Oleada 1)'],
    ['This action cannot be undone. The game will reload.','Esta acción no se puede deshacer. El juego se reiniciará.'],
    ['Existence is a temporary glitch in the nothingness.','La existencia es un fallo temporal en la nada.'],
    ['Stand still to charge a massive Big Bang explosion.','Quédate quieto para cargar una explosión Big Bang masiva.'],
    ['Spawns a stationary sun that burns nearby enemies.','Genera un sol estacionario que quema enemigos cercanos.'],
    ['A colossal mechanical giant that smashes reality.','Un gigante mecánico colosal que aplasta la realidad.'],
    ['Manifests a tracking spirit that pursues enemies.','Manifiesta un espíritu rastreador que persigue enemigos.'],
    ['Do you think killing the flesh kills the hunger?','¿Crees que matar la carne mata el hambre?'],
    ['The darkness is not an enemy, it is your origin.','La oscuridad no es un enemigo, es tu origen.'],
    ['You are not the first. You will not be the last.','No eres el primero. No serás el último.'],
    ['The cycle is broken. You have become the light.','El ciclo se ha roto. Te has convertido en la luz.'],
    ['The universe is returning to its natural state.','El universo vuelve a su estado natural.'],
    ['Time is a flat circle, and you are at its end.','El tiempo es un círculo plano, y tú estás en su fin.'],
    ['Your photons have been scattered to the winds.','Tus fotones se han dispersado a los vientos.'],
    ['The abyss gazes back, and it is disappointed.','El abismo te devuelve la mirada, y está decepcionado.'],
    ['The darkness is the only thing that is whole.','La oscuridad es lo único que está completo.'],
    ['The darkness is the only thing that survives.','La oscuridad es lo único que sobrevive.'],
    ['The void is the destination of every journey.','El vacío es el destino de todo viaje.'],
    ['Your light was a flicker in the eye of a god.','Tu luz fue un parpadeo en el ojo de un dios.'],
    ['Your light was a fragment of a broken mirror.','Tu luz fue un fragmento de un espejo roto.'],
    ['Your luminescence was an insult to the night.','Tu luminiscencia fue un insulto a la noche.'],
    ['Lightning that arcs between multiple enemies.','Rayo que salta entre varios enemigos.'],
    ['You are nothing against the machine of fate.','No eres nada contra la máquina del destino.'],
    ['The dark is the only thing that doesn\\'t lie.','La oscuridad es lo único que no miente.'],
    ['The darkness is the only thing that is true.','La oscuridad es lo único que es verdadero.'],
    ['There is no light at the end of this tunnel.','No hay luz al final de este túnel.'],
    ['Your radiation was a whisper in a hurricane.','Tu radiación fue un susurro en un huracán.'],
    ['Your struggle was a masterpiece of futility.','Tu lucha fue una obra maestra de la futilidad.'],
    ['Light is just a localized lack of darkness.','La luz es solo una ausencia localizada de oscuridad.'],
    ['The dark is the only thing that is eternal.','La oscuridad es lo único que es eterno.'],
    ['You were a brief interruption of the quiet.','Fuiste una breve interrupción del silencio.'],
    ['Fires a concentrated blast of solar energy.','Dispara una ráfaga concentrada de energía solar.'],
    ['Surrender your essence to the true master.','Rinde tu esencia al verdadero maestro.'],
    ['Massive, gentle giant. Dangerous to touch.','Gigante enorme y gentil. Peligroso al tacto.'],
    ['Defeat Darkness having The Omega Sun title','Derrota a la Oscuridad teniendo el título El Sol Omega'],
    ['The void does not hate you. It simply is.','El vacío no te odia. Simplemente es.'],
    ['The void is the only one who understands.','El vacío es el único que entiende.'],
    ['The void is the only truth you ever knew.','El vacío es la única verdad que conociste.'],
    ['The void remembers everything you forgot.','El vacío recuerda todo lo que olvidaste.'],
    ['Your light was a gift you didn\\'t deserve.','Tu luz fue un regalo que no merecías.'],
    ['Every beginning is a lie told by the end.','Todo comienzo es una mentira contada por el fin.'],
    ['Leave a trail of cosmic dust as you move.','Deja una estela de polvo cósmico al moverte.'],
    ['This star once fought me, just like you.','Esta estrella luchó contra mí una vez, igual que tú.'],
    ['The Warden will return you to the quiet.','El Guardián te devolverá al silencio.'],
    ['The event horizon has claimed its prize.','El horizonte de sucesos ha reclamado su premio.'],
    ['The silence is louder than your screams.','El silencio es más ruidoso que tus gritos.'],
    ['The void is the only thing that is real.','El vacío es lo único que es real.'],
    ['You are a drop of light in a sea of ink.','Eres una gota de luz en un mar de tinta.'],
    ['You fought well for a flickering candle.','Luchaste bien para ser una vela parpadeante.'],
    ['You were a star that forgot how to burn.','Fuiste una estrella que olvidó cómo arder.'],
    ['You were a whisper in a room of silence.','Fuiste un susurro en una habitación de silencio.'],
    ['Unlock at least Level 1 of every ability','Desbloquea al menos el Nivel 1 de cada habilidad'],
    ['Another spark extinguished in the deep.','Otra chispa extinguida en las profundidades.'],
    ['Rest now. The struggle was meaningless.','Descansa ahora. La lucha no tuvo sentido.'],
    ['The stars are just holes in the shroud.','Las estrellas son solo agujeros en el sudario.'],
    ['The void is patient. It waited for you.','El vacío es paciente. Te esperó.'],
    ['Your heat has dissipated into the zero.','Tu calor se ha disipado en el cero.'],
    ['Your light was a debt you couldn\\'t pay.','Tu luz fue una deuda que no pudiste pagar.'],
    ['Leaves damaging sun flares in its wake.','Deja llamaradas solares dañinas a su paso.'],
    ['Moves at terrifying speeds to hunt you.','Se mueve a velocidades aterradoras para cazarte.'],
    ['Did you really think you could escape?','¿De verdad creías que podías escapar?'],
    ['The void is the only thing that lasts.','El vacío es lo único que perdura.'],
    ['You were a signal in a world of noise.','Fuiste una señal en un mundo de ruido.'],
    ['Your essence is now part of the swarm.','Tu esencia es ahora parte del enjambre.'],
    ['A faint glimmer in the infinite dark.','Un tenue resplandor en la oscuridad infinita.'],
    ['Don\\'t fight the gravity of your sins.','No luches contra la gravedad de tus pecados.'],
    ['Nothing is more certain than the end.','Nada es más seguro que el fin.'],
    ['The void has a place for every spark.','El vacío tiene un lugar para cada chispa.'],
    ['You are free now. Free to be nothing.','Ahora eres libre. Libre de ser nada.'],
    ['Your heat was a sin against the cold.','Tu calor fue un pecado contra el frío.'],
    ['If the universe will not kill you...','Si el universo no te matará...'],
    ['The cosmic budget has been balanced.','El presupuesto cósmico ha sido balanceado.'],
    ['Your core has reached absolute zero.','Tu núcleo ha alcanzado el cero absoluto.'],
    ['Your existence was a rounding error.','Tu existencia fue un error de redondeo.'],
    ['Your trajectory was always downward.','Tu trayectoria siempre fue hacia abajo.'],
    ['Erratic, exploding energy discharge.','Descarga de energía errática y explosiva.'],
    ['Give up, there is no hope for light','Ríndete, no hay esperanza para la luz'],
    ['Feel the despair of your existence.','Siente la desesperación de tu existencia.'],
    ['You were a spark in a frozen ocean.','Fuiste una chispa en un océano congelado.'],
    ['Entropy is the only absolute truth.','La entropía es la única verdad absoluta.'],
    ['A chaos engine of pure destruction.','Una máquina de caos de pura destrucción.'],
    ['Cleanses slows and grants immunity.','Elimina ralentizaciones y otorga inmunidad.'],
    ['Dasher that phases through reality.','Corredor que atraviesa la realidad.'],
    ['Be the spark that refuses to fade.','Sé la chispa que se niega a apagarse.'],
    ['The swarm hungers for your warmth.','El enjambre ansía tu calor.'],
    ['Nothingness is the ultimate peace.','La nada es la paz definitiva.'],
    ['The light was a mask for the fear.','La luz era una máscara para el miedo.'],
    ['The spiral has reached its center.','La espiral ha alcanzado su centro.'],
    ['Your memory is already dissolving.','Tu memoria ya se está disolviendo.'],
    ['Increases speed of nearby enemies.','Aumenta la velocidad de enemigos cercanos.'],
    ['Stationary unit firing wave rings.','Unidad estacionaria que dispara anillos de onda.'],
    ['Weak scavenger attracted to light.','Carroñero débil atraído por la luz.'],
    ['A flicker. A flash. Then nothing.','Un parpadeo. Un destello. Luego nada.'],
    ['Circles the player at a distance.','Rodea al jugador a distancia.'],
    ['Flying tank with spinning lasers.','Tanque volador con láseres giratorios.'],
    ['Freezes enemies in a wide radius.','Congela enemigos en un amplio radio.'],
    ['Weaves complex movement patterns.','Teje patrones de movimiento complejos.'],
    ['You wander too far, little dust.','Vagas demasiado lejos, pequeño polvo.'],
    ['Now it screams in eternal agony.','Ahora grita en agonía eterna.'],
    ['Fade away. It\\'s easier this way.','Desvanécete. Es más fácil así.'],
    ['The shadow always wins the race.','La sombra siempre gana la carrera.'],
    ['The vacuum has no room for hope.','El vacío no tiene lugar para la esperanza.'],
    ['Why shine when you can be still?','¿Por qué brillar cuando puedes estar quieto?'],
    ['Your light was a borrowed flame.','Tu luz fue una llama prestada.'],
    ['Indestructible object (high HP).','Objeto indestructible (vida alta).'],
    ['Intense magnetic pull with arcs.','Atracción magnética intensa con arcos.'],
    ['Phases out of reality to strike.','Sale de la realidad para atacar.'],
    ['There is no death, only change.','No hay muerte, solo cambio.'],
    ['I am the cure for the universe.','Soy la cura del universo.'],
    ['The great collapse is complete.','El gran colapso está completo.'],
    ['Your singularity has collapsed.','Tu singularidad ha colapsado.'],
    ['Hard shell, persistent pursuer.','Caparazón duro, perseguidor persistente.'],
    ['Shoots projectiles in a spiral.','Dispara proyectiles en espiral.'],
    ['Teleports closer to its target.','Se teletransporta cerca de su objetivo.'],
    ['Unlock 100% of the Ability Tree','Desbloquea el 100% del Árbol de Habilidades'],
    ['Ignite the divine spark within','Enciende la chispa divina interior'],
    ['This universe is mine to wake.','Este universo es mío para despertarlo.'],
    ['I built this to end universes.','Construí esto para acabar con universos.'],
    ['Gravity is the void\\'s embrace.','La gravedad es el abrazo del vacío.'],
    ['The silence is the final word.','El silencio es la palabra final.'],
    ['You were a dream the void had.','Fuiste un sueño que tuvo el vacío.'],
    ['You were a ghost of the light.','Fuiste un fantasma de la luz.'],
    ['Your light has been reclaimed.','Tu luz ha sido reclamada.'],
    ['Hunts the player relentlessly.','Caza al jugador sin piedad.'],
    ['Massive gravitational anomaly.','Anomalía gravitatoria masiva.'],
    ['Possess 10,000,000 Dark Matter','Posee 10.000.000 de Materia Oscura'],
    ['Unlock 25% of the Ability Tree','Desbloquea el 25% del Árbol de Habilidades'],
    ['Unlock 50% of the Ability Tree','Desbloquea el 50% del Árbol de Habilidades'],
    ['Unlock 75% of the Ability Tree','Desbloquea el 75% del Árbol de Habilidades'],
    ['(dash with right click/space)','(esquiva con clic derecho/espacio)'],
    ['My light reaches further now.','Mi luz llega más lejos ahora.'],
    ['I will illuminate this place.','Iluminaré este lugar.'],
    ['Now, I will spread the light.','Ahora, esparciré la luz.'],
    ['I do not care for the hunger.','No me importa el hambre.'],
    ['The shadow is your true self.','La sombra es tu verdadero yo.'],
    ['You were a beautiful mistake.','Fuiste un hermoso error.'],
    ['Your light has been digested.','Tu luz ha sido digerida.'],
    ['Freezes player (visual only).','Congela al jugador (solo visual).'],
    ['Defeat the Collapsing Neutron','Derrota al Neutrón Colapsante'],
    ['Possess 1,000,000 Dark Matter','Posee 1.000.000 de Materia Oscura'],
    ['Reach the final Maturity Rank','Alcanza el Rango de Madurez final'],
    ['I am small, but I am bright.','Soy pequeño, pero soy brillante.'],
    ['I am no longer just a spark.','Ya no soy solo una chispa.'],
    ['Gravity always gets its way.','La gravedad siempre se sale con la suya.'],
    ['Welcome back to the silence.','Bienvenido de vuelta al silencio.'],
    ['You are the shadow\\'s shadow.','Eres la sombra de la sombra.'],
    ['Casts miniature black holes.','Lanza agujeros negros en miniatura.'],
    ['Archive 100% of all Entities','Archiva el 100% de todas las Entidades'],
    ['Reach the final Light Phrase','Alcanza la Frase de Luz final'],
    ['PRESS ESC FOR CONSTELLATION','PULSA ESC PARA LA CONSTELACIÓN'],
    ['The universe has collapsed.','El universo ha colapsado.'],
    ['Darkness defines the light.','La oscuridad define la luz.'],
    ['They retreat from my touch.','Retroceden ante mi toque.'],
    ['I triumph against darkness.','Triunfo contra la oscuridad.'],
    ['Do you hear the scratching?','¿Oyes el rasguñeo?'],
    ['The silence is your reward.','El silencio es tu recompensa.'],
    ['Hard to see, shoots lasers.','Difícil de ver, dispara láseres.'],
    ['Pulls player while weaving.','Atrae al jugador mientras teje.'],
    ['Splits into two upon death.','Se divide en dos al morir.'],
    ['Stealthy, high damage dash.','Sigiloso, esquive de alto daño.'],
    ['Strong pull, does not move.','Atracción fuerte, no se mueve.'],
    ['Archive 25% of all Entities','Archiva el 25% de todas las Entidades'],
    ['Archive 50% of all Entities','Archiva el 50% de todas las Entidades'],
    ['Archive 75% of all Entities','Archiva el 75% de todas las Entidades'],
    ['Possess 100,000 Dark Matter','Posee 100.000 de Materia Oscura'],
    ['Pointer Mouse moves player','El puntero mueve al jugador'],
    ['SELECT ENTITY FOR ANALYSIS','SELECCIONA ENTIDAD PARA ANALIZAR'],
    ['I am stronger than I knew.','Soy más fuerte de lo que creía.'],
    ['The light is all there is.','La luz es todo lo que hay.'],
    ['There is a purpose for me.','Hay un propósito para mí.'],
    ['From light hope will born.','De la luz nacerá la esperanza.'],
    ['I only care that it burns.','Solo me importa que arda.'],
    ['It crushes hope into dust.','Aplasta la esperanza en polvo.'],
    ['The zero has come for you.','El cero ha venido por ti.'],
    ['You were never truly here.','Nunca estuviste realmente aquí.'],
    ['Chain lightning construct.','Constructo de rayo en cadena.'],
    ['Drains essence on contact.','Drena esencia al contacto.'],
    ['Slithers through the void.','Se desliza por el vacío.'],
    ['They try to snuff me out.','Intentan apagarme.'],
    ['The cold cannot touch me.','El frío no puede tocarme.'],
    ['What is this disturbance?','¿Qué es esta perturbación?'],
    ['But the hive is infinite.','Pero la colmena es infinita.'],
    ['Silence. Perfect silence.','Silencio. Silencio perfecto.'],
    ['The mirror has shattered.','El espejo se ha roto.'],
    ['The silence has answered.','El silencio ha respondido.'],
    ['You can stop running now.','Ya puedes dejar de correr.'],
    ['Your heat was an anomaly.','Tu calor fue una anomalía.'],
    ['A fragment of pure chaos.','Un fragmento de puro caos.'],
    ['Area of effect lightning.','Rayo de área de efecto.'],
    ['Huge serpent of the deep.','Enorme serpiente de las profundidades.'],
    ['CONSTELLATION OF VIRTUES','CONSTELACIÓN DE VIRTUDES'],
    ['Constellation of Virtues','Constelación de Virtudes'],
    ['Collision creates spark.','La colisión crea la chispa.'],
    ['Energy flows through me.','La energía fluye a través de mí.'],
    ['The physical is a shell.','Lo físico es una cáscara.'],
    ['I am part of the fabric.','Soy parte del tejido.'],
    ['And I will acomplish it.','Y lo cumpliré.'],
    ['You are not just a dust.','No eres solo polvo.'],
    ['Broken. Cold. Forgotten.','Rota. Fría. Olvidada.'],
    ['Extremely high HP, slow.','Vida altísima, lento.'],
    ['Freezes movement nearby.','Congela el movimiento cercano.'],
    ['Moves in erratic swarms.','Se mueve en enjambres erráticos.'],
    ['Rotates shooting lasers.','Gira disparando láseres.'],
    ['Tiny, teleports rapidly.','Diminuto, se teletransporta rápido.'],
    ['This is a new beginning','Este es un nuevo comienzo'],
    ['The light will triumph.','La luz triunfará.'],
    ['I just closed its eyes.','Solo le cerré los ojos.'],
    ['The walls... shattered?','Los muros... ¿destrozados?'],
    ['Part of a greater evil.','Parte de un mal mayor.'],
    ['Extremely fast, low hp.','Extremadamente rápido, baja vida.'],
    ['Leaves a damaging wake.','Deja una estela dañina.'],
    ['Mimics player movement.','Imita el movimiento del jugador.'],
    ['Repairs other machines.','Repara otras máquinas.'],
    ['Snipes from a distance.','Dispara desde la distancia.'],
    ['Spawns exploding stars.','Engendra estrellas explosivas.'],
    ['Audio API not supported','API de Audio no soportada'],
    ['Fear is just a shadow.','El miedo es solo una sombra.'],
    ['I am becoming a storm.','Me estoy convirtiendo en tormenta.'],
    ['I am a thought of God.','Soy un pensamiento de Dios.'],
    ['I am the hope bringer.','Soy el portador de la esperanza.'],
    ['You extinguished it...','Lo extinguiste...'],
    ['Absolute. Final. Void.','Absoluto. Final. Vacío.'],
    ['The noise has stopped.','El ruido ha cesado.'],
    ['The vacuum is thirsty.','El vacío tiene sed.'],
    ['Slow, heavy tank unit.','Unidad tanque, lenta y pesada.'],
    ['Defeat the Void Warden','Derrota al Guardián del Vacío'],
    ['Touch Buttons to move','Botones táctiles para moverse'],
    ['Performance & Visuals','Rendimiento y Efectos'],
    ['Light integrity cells','Células de integridad lumínica'],
    ['Thank you for playing','Gracias por jugar'],
    ['The silence is heavy.','El silencio es pesado.'],
    ['My reach is infinite.','Mi alcance es infinito.'],
    ['You severed the limb.','Cortaste la extremidad.'],
    ['The immovable object.','El objeto inmóvil.'],
    ['Cold. Dark. Infinite.','Frío. Oscuro. Infinito.'],
    ['The though has faded.','El pensamiento se ha desvanecido.'],
    ['Wake up. You\\'re dead.','Despierta. Estás muerto.'],
    ['Pulses then explodes.','Pulsa y luego explota.'],
    ['Select Starting Wave','Selecciona Oleada Inicial'],
    ['DELETE ALL SAVE DATA','ELIMINAR TODOS LOS DATOS'],
    ['The cycle is broken.','El ciclo se ha roto.'],
    ['The void is patient.','El vacío es paciente.'],
    ['To shine is to live.','Brillar es vivir.'],
    ['I am the hunter now.','Ahora soy el cazador.'],
    ['I am the lighthouse.','Soy el faro.'],
    ['It was already dead.','Ya estaba muerta.'],
    ['I WILL DO IT MYSELF.','LO HARÉ YO MISMO.'],
    ['The void is eternal.','El vacío es eterno.'],
    ['Darkness is the law.','La oscuridad es la ley.'],
    ['The god has blinked.','El dios ha parpadeado.'],
    ['Explodes on contact.','Explota al contacto.'],
    ['Fast, burning trail.','Estela rápida y ardiente.'],
    ['Heals nearby allies.','Cura a aliados cercanos.'],
    ['Leaves burning path.','Deja un camino en llamas.'],
    ['Spawns Prism Larvae.','Engendra Larvas de Prisma.'],
    ['Failed to clear save','Error al borrar la partida'],
    ['Select Respawn Wave','Selecciona Oleada de Reaparición'],
    ['Why do they hunger?','¿Por qué tienen hambre?'],
    ['I must keep moving.','Debo seguir moviéndome.'],
    ['They are but moths.','No son más que polillas.'],
    ['All from one light.','Todo desde una sola luz.'],
    ['I am weaving light.','Estoy tejiendo luz.'],
    ['Order must be kept.','Debe mantenerse el orden.'],
    ['Slight improvement.','Ligera mejora.'],
    ['Event Horizon Torch','Antorcha del Horizonte'],
    ['Deadly sniper beam.','Rayo francotirador mortal.'],
    ['Failed to load save','Error al cargar la partida'],
    ['CLOSE TRANSMISSION','CERRAR TRANSMISIÓN'],
    ['Everyone wants me.','Todos me quieren.'],
    ['I am not the dark.','No soy la oscuridad.'],
    ['My core is stable.','Mi núcleo es estable.'],
    ['Shadows burn away.','Las sombras se consumen.'],
    ['The void trembles.','El vacío tiembla.'],
    ['Goodbye, darkness.','Adiós, oscuridad.'],
    ['I am the question.','Soy la pregunta.'],
    ['The dream is over.','El sueño ha terminado.'],
    ['I am not a poison.','No soy un veneno.'],
    ['How... irritating.','Qué... irritante.'],
    ['Broken into scrap.','Rota en pedazos.'],
    ['Conflagration King','Rey de la Conflagración'],
    ['Spectral Architect','Arquitecto Espectral'],
    ['COLLAPSING NEUTRON','NEUTRÓN COLAPSANTE'],
    ['Spawns Void Crabs.','Engendra Cangrejos del Vacío.'],
    ['Swoops in and out.','Se abalanza y se retira.'],
    ['Watches from afar.','Observa desde lejos.'],
    ['RE-IGNITE AT WAVE','RE-ENCENDER EN OLEADA'],
    ['Control Interface','Interfaz de Control'],
    ['I bring the heat.','Traigo el calor.'],
    ['I hold the stars.','Sostengo las estrellas.'],
    ['I have a purpose.','Tengo un propósito.'],
    ['I choose freedom.','Elijo la libertad.'],
    ['You are a poison.','Eres un veneno.'],
    ['Mercy? Or murder?','¿Piedad? ¿O asesinato?'],
    ['You are home now.','Ahora estás en casa.'],
    ['Scorched Sentinel','Centinela Chamuscado'],
    ['Singularity Spark','Chispa Singular'],
    ['The Eternal Flame','La Llama Eterna'],
    ['Big Bang Ignition','Ignición del Big Bang'],
    ['Aetheric Filament','Filamento Etéreo'],
    ['Existence-Igniter','Encendedor de Existencia'],
    ['Dimensional Flare','Llamarada Dimensional'],
    ['Star Extinguisher','Apagador Estelar'],
    ['The Great Silence','El Gran Silencio'],
    ['Light Rogue Void','Luz Rogue Void'],
    ['MAX WAVE RECORD:','RÉCORD MÁX. DE OLEADA:'],
    ['RETURN TO CENTER','VOLVER AL CENTRO'],
    ['CONFIRM DELETION','CONFIRMAR ELIMINACIÓN'],
    ['UNLOCK / UPGRADE','DESBLOQUEAR / MEJORAR'],
    ['CRITICAL FAILURE','FALLO CRÍTICO'],
    ['I can push back.','Puedo contraatacar.'],
    ['I will not fade.','No me desvaneceré.'],
    ['I am the center.','Soy el centro.'],
    ['Wisdom is light.','La sabiduría es luz.'],
    ['Hello, eternity.','Hola, eternidad.'],
    ['I am the answer.','Soy la respuesta.'],
    ['My realm begins.','Mi reino comienza.'],
    ['Solar Prominence','Prominencia Solar'],
    ['The Unquenchable','El Inextinguible'],
    ['The First Photon','El Primer Fotón'],
    ['Phantom Assassin','Asesino Fantasma'],
    ['Orbital Fortress','Fortaleza Orbital'],
    ['Monolith of Noon','Monolito del Mediodía'],
    ['Arsenal Complete','Arsenal Completo'],
    ['SYSTEM SETTINGS','AJUSTES DEL SISTEMA'],
    ['System Settings','Ajustes del Sistema'],
    ['Data Management','Gestión de Datos'],
    ['DEV: Goodboycat','DEV: Goodboycat'],
    ['Join the choir.','Únete al coro.'],
    ['Ash-Bound Spark','Chispa de Ceniza'],
    ['Drifting Kindle','Yesca Errante'],
    ['Smoldering Coal','Carbón Latente'],
    ['Roaring Furnace','Horno Rugiente'],
    ['Blinding Beacon','Faro Cegador'],
    ['Stellar Remnant','Remanente Estelar'],
    ['Supernova Shell','Cáscara de Supernova'],
    ['Finality\\'s Glow','Resplandor de Finalidad'],
    ['Finality’s Glow','Resplandor de Finalidad'],
    ['Infinity\\'s Wick','Mecha del Infinito'],
    ['Infinity’s Wick','Mecha del Infinito'],
    ['Repulsion Field','Campo de Repulsión'],
    ['Omega Construct','Constructo Omega'],
    ['CRIMSON ECLIPSE','ECLIPSE CARMESÍ'],
    ['THE VOID WARDEN','EL GUARDIÁN DEL VACÍO'],
    ['Summons Ghosts.','Invoca Fantasmas.'],
    ['Defeat Darkness','Derrota a la Oscuridad'],
    ['LIVE RENDERING','RENDERIZADO EN VIVO'],
    ['Developer Note','Nota del Desarrollador'],
    ['I will escape.','Escaparé.'],
    ['I will change.','Cambiaré.'],
    ['They are cold.','Están fríos.'],
    ['I am learning.','Estoy aprendiendo.'],
    ['I am a beacon.','Soy un faro.'],
    ['Steady Lantern','Linterna Constante'],
    ['Raging Inferno','Infierno Furioso'],
    ['White-Hot Core','Núcleo Incandescente'],
    ['Radiant Pillar','Pilar Radiante'],
    ['Universal Kiln','Horno Universal'],
    ['Reality Weaver','Tejedor de Realidad'],
    ['Reality-Bender','Doblador de Realidad'],
    ['Absolute Being','Ser Absoluto'],
    ['Guardian Aegis','Égida Guardiana'],
    ['Stardust Trail','Estela de Polvo Estelar'],
    ['Homing Missile','Misil Rastreador'],
    ['Seeking Spirit','Espíritu Rastreador'],
    ['Prism Guardian','Guardián de Prisma'],
    ['Void Leviathan','Leviatán del Vacío'],
    ['Stardust Whale','Ballena de Polvo Estelar'],
    ['Entropy Avatar','Avatar de Entropía'],
    ['Warden Breaker','Rompe-Guardián'],
    ['REBOOT SYSTEM','REINICIAR SISTEMA'],
    ['ESC TO RESUME','ESC PARA REANUDAR'],
    ['Master Volume','Volumen General'],
    ['Maturity Rank','Rango de Madurez'],
    ['Previous Node','Nodo Anterior'],
    ['TRANSCENDENCE','TRASCENDENCIA'],
    ['Transcendence','Trascendencia'],
    ['Look closely.','Mira de cerca.'],
    ['I am growing.','Estoy creciendo.'],
    ['Enough games.','Basta de juegos.'],
    ['My machine...','Mi máquina...'],
    ['ROAAAAAAAR!!!','RUAAAAAAAR!!!'],
    ['Tinder-Thirst','Sed de Yesca'],
    ['Searing Singe','Chamusquina Abrasadora'],
    ['Brazen Ignite','Ignición Descarada'],
    ['Wildfire Seed','Semilla de Fuego'],
    ['Helios Aspect','Aspecto Helios'],
    ['Plasma Nebula','Nebulosa de Plasma'],
    ['Galaxy Burner','Quema-Galaxias'],
    ['Entropy Eater','Devorador de Entropía'],
    ['New Beginning','Nuevo Comienzo'],
    ['Aurora Weaver','Tejedor de Aurora'],
    ['Truth-Bringer','Portador de Verdad'],
    ['Genesis Pulse','Pulso Génesis'],
    ['Chronos Flame','Llama de Chronos'],
    ['Astral Beacon','Faro Astral'],
    ['The Prime Ray','El Rayo Primigenio'],
    ['The Omega Sun','El Sol Omega'],
    ['Luminous Lash','Látigo Luminoso'],
    ['Thunder Chain','Cadena de Truenos'],
    ['Orbital Guard','Guardia Orbital'],
    ['Event Horizon','Horizonte de Sucesos'],
    ['Kamikaze Star','Estrella Kamikaze'],
    ['Geo Construct','Constructo Geológico'],
    ['Vortex Weaver','Tejedor de Vórtice'],
    ['Spiral Dancer','Bailarín Espiral'],
    ['Apex Predator','Depredador Ápice'],
    ['Enlightenment','Iluminación'],
    ['ENTROPY TITAN','TITÁN DE ENTROPÍA'],
    ['THE HIVE MIND','LA MENTE COLMENA'],
    ['ACHIEVEMENTS','LOGROS'],
    ['Music Volume','Volumen de Música'],
    ['Purchase All','Comprar Todo'],
    ['EXTINGUISHED','EXTINGUIDO'],
    ['Burning Mote','Mota Ardiente'],
    ['Flicker-Soul','Alma Trémula'],
    ['Glimmer-Born','Nacido del Resplandor'],
    ['Torch-Bearer','Portador de Antorcha'],
    ['Hearth-Heart','Corazón de Hogar'],
    ['Signal Flare','Bengala Señal'],
    ['Living Flame','Llama Viviente'],
    ['Rising Blaze','Fuego Naciente'],
    ['Brazier Lord','Señor del Brasero'],
    ['World-Burner','Quema-Mundos'],
    ['Corona Crest','Cresta Coronal'],
    ['Binary Flare','Llamarada Binaria'],
    ['Quasar Flame','Llama Cuásar'],
    ['Prism-Walker','Caminante del Prisma'],
    ['Void-Piercer','Perforador del Vacío'],
    ['Gravity Well','Pozo Gravitatorio'],
    ['Titan Shield','Escudo Titán'],
    ['Nebula Trail','Estela Nebular'],
    ['Nanite Cloud','Nube de Nanites'],
    ['Static Cloud','Nube Estática'],
    ['Plasma Storm','Tormenta de Plasma'],
    ['Neon Serpent','Serpiente de Neón'],
    ['Chaos Engine','Máquina del Caos'],
    ['Entropy Core','Núcleo de Entropía'],
    ['Doppelganger','Doppelgänger'],
    ['Mender Drone','Dron Reparador'],
    ['The Immortal','El Inmortal'],
    ['Perfect Form','Forma Perfecta'],
    ['Echo blinker','Parpadeante de eco'],
    ['What is me?','¿Qué soy?'],
    ['Consume it.','Consúmelo.'],
    ['Dying Ember','Ascua Moribunda'],
    ['Faint Glint','Destello Tenue'],
    ['Candle-Stub','Cabo de Vela'],
    ['Pilot Light','Piloto Luminoso'],
    ['Incinerator','Incinerador'],
    ['Zenith Heat','Calor del Cénit'],
    ['White Dwarf','Enana Blanca'],
    ['Solar Flare','Erupción Solar'],
    ['Comet Trail','Estela de Cometa'],
    ['Pulsar Bomb','Bomba Pulsar'],
    ['Ring Turret','Torreta de Anillo'],
    ['Prism Larva','Larva de Prisma'],
    ['Hive Mother','Madre Colmena'],
    ['Void Wraith','Espectro del Vacío'],
    ['Phase Shade','Sombra de Fase'],
    ['Necromancer','Nigromante'],
    ['Void Tycoon','Magnate del Vacío'],
    ['Void Killer','Verdugo del Vacío'],
    ['SINGULARITY','SINGULARIDAD'],
    ['Singularity','Singularidad'],
    ['INITIALIZE','INICIAR'],
    ['SFX Volume','Volumen de Efectos'],
    ['Goodboycat','Goodboycat'],
    ['SIZE CLASS','CLASE DE TAMAÑO'],
    ['HIT POINTS','PUNTOS DE VIDA'],
    ['Base Stats','Estadísticas Base'],
    ['Minor Node','Nodo Menor'],
    ['Feed them.','Aliméntalos.'],
    ['Cauterizer','Cauterizador'],
    ['Great Pyre','Gran Pira'],
    ['Molten Maw','Fauces Fundidas'],
    ['Nova Pulse','Pulso de Nova'],
    ['Aeon Shard','Fragmento de Eón'],
    ['Zero Point','Punto Cero'],
    ['Solar Wisp','Fuego Fatuo Solar'],
    ['Lux Blades','Hojas de Lux'],
    ['Super Dash','Súper Esquive'],
    ['Fire Blast','Explosión de Fuego'],
    ['Tesla Coil','Bobina Tesla'],
    ['White Hole','Agujero Blanco'],
    ['Hydra Head','Cabeza de Hidra'],
    ['Brood Lord','Señor de Cría'],
    ['Researcher','Investigador'],
    ['NEW CYCLE','NUEVO CICLO'],
    ['MAIN MENU','MENÚ PRINCIPAL'],
    ['DATA LOG:','REGISTRO:'],
    ['Next Node','Nodo Siguiente'],
    ['Sun-Spoke','Radio de Sol'],
    ['Sol-Child','Hijo del Sol'],
    ['Protostar','Protoestrella'],
    ['Red Giant','Gigante Roja'],
    ['Hypernova','Hipernova'],
    ['Omni-Fire','Omnifuego'],
    ['Solar Ray','Rayo Solar'],
    ['Fireflies','Luciérnagas'],
    ['Gamma Ray','Rayo Gamma'],
    ['Void Crab','Cangrejo del Vacío'],
    ['Star Mite','Ácaro Estelar'],
    ['Iron Clad','Acorazado'],
    ['Nullifier','Anulador'],
    ['Willpower','Voluntad'],
    ['Fortitude','Fortaleza'],
    ['Expansion','Expansión'],
    ['Influence','Influencia'],
    ['THE SPARK','LA CHISPA'],
    ['CONSTRUCT','CONSTRUCTO'],
    ['EXPLOSION','EXPLOSIÓN'],
    ['SETTINGS','AJUSTES'],
    ['ARCHIVES','ARCHIVOS'],
    ['DEV NOTE','NOTA DEL DEV'],
    ['MAX WAVE','OLEADA MÁX'],
    ['A spark?','¿Una chispa?'],
    ['I exist.','Existo.'],
    ['Neutrino','Neutrino'],
    ['Fracture','Fractura'],
    ['Ice Nova','Nova de Hielo'],
    ['Valkyrie','Valquiria'],
    ['War Drum','Tambor de Guerra'],
    ['Monolith','Monolito'],
    ['Observer','Observador'],
    ['Radiance','Resplandor'],
    ['Celerity','Celeridad'],
    ['Aperture','Apertura'],
    ['DARKNESS','OSCURIDAD'],
    ['CLEANSER','PURIFICADOR'],
    ['TELEPORT','TELETRANSPORTE'],
    ['Language','Idioma'],
    ['TO MOVE','PARA MOVER'],
    ['DEFAULT','PREDET.'],
    ['Hi, I\\'m','Hola, soy'],
    ['OFFENSE','ATAQUE'],
    ['DEFENSE','DEFENSA'],
    ['UTILITY','UTILIDAD'],
    ['BUY ALL','COMPRAR TODO'],
    ['Wait...','Espera...'],
    ['I burn.','Ardo.'],
    ['Firefly','Luciérnaga'],
    ['Analyst','Analista'],
    ['Insight','Perspicacia'],
    ['Mending','Reparación'],
    ['ECLIPSE','ECLIPSE'],
    ['NEUTRON','NEUTRÓN'],
    ['SPAWNER','ENGENDRADOR'],
    ['SWARMER','ENJAMBRE'],
    ['SERPENT','SERPIENTE'],
    ['CRYSTAL','CRISTAL'],
    ['THUNDER','TRUENO'],
    ['EXPLODE','EXPLOSIÓN'],
    ['UNKNOWN','DESCONOCIDO'],
    ['FIREFLY','LUCIÉRNAGA'],
    ['English','Inglés'],
    ['Spanish','Español'],
    ['RESUME','REANUDAR'],
    ['MEDIUM','MEDIO'],
    ['MOBILE','MÓVIL'],
    ['NORMAL','NORMAL'],
    ['SIMPLE','SIMPLE'],
    ['ACTIVE','ACTIVO'],
    ['REWARD','RECOMPENSA'],
    ['CLASS:','CLASE:'],
    ['YOU...','TÚ...'],
    ['I won.','Gané.'],
    ['Mirage','Espejismo'],
    ['Fervor','Fervor'],
    ['PULSAR','PÚLSAR'],
    ['WARDEN','GUARDIÁN'],
    ['WEAVER','TEJEDOR'],
    ['SNIPER','FRANCOTIRADOR'],
    ['HEALER','SANADOR'],
    ['SELECT','SELECCIONAR'],
    ['SCRIPT','GUIÓN'],
    ['Cancel','Cancelar'],
    ['BUTTON','BOTÓN'],
    ['Audio','Audio'],
    ['STYLE','ESTILO'],
    ['SPEED','VELOCIDAD'],
    ['Fine.','Bien.'],
    ['Rogue','Rogue'],
    ['LIGHT','LUZ'],
    ['TITAN','TITÁN'],
    ['SPARK','CHISPA'],
    ['SWARM','ENJAMBRE'],
    ['CHASE','PERSEGUIDOR'],
    ['ORBIT','ORBITAL'],
    ['GHOST','FANTASMA'],
    ['MIMIC','IMITADOR'],
    ['LASER','LÁSER'],
    ['TRAIL','ESTELA'],
    ['SPLIT','DIVISOR'],
    ['SMOKE','HUMO'],
    ['HIGH','ALTO'],
    ['Wave','Oleada'],
    ['WAVE','OLEADA'],
    ['Wisp','Fuego Fatuo'],
    ['Omen','Presagio'],
    ['VOID','VACÍO'],
    ['SKIP','OMITIR'],
    ['LOW','BAJO']
  ];

  // Build exact-match map (fast path) and a length-sorted list for composite text
  var DICT_EN2ES = Object.create(null);
  for (var i = 0; i < ENTRIES.length; i++) DICT_EN2ES[ENTRIES[i][0]] = ENTRIES[i][1];
  var DICT_ES2EN = Object.create(null);
  for (var j = 0; j < ENTRIES.length; j++) {
    // Only set if not already set (avoid collisions on same-word)
    if (!DICT_ES2EN[ENTRIES[j][1]]) DICT_ES2EN[ENTRIES[j][1]] = ENTRIES[j][0];
  }

  // Translate a single text-node value in the current language direction.
  // Strategy: (1) try exact match after trim; (2) try composite replace with length-sorted keys.
  function translateText(text) {
    if (!text) return text;
    // Preserve leading/trailing whitespace
    var m = text.match(/^(\\s*)([\\s\\S]*?)(\\s*)$/);
    var lead = m[1], core = m[2], trail = m[3];
    if (!core) return text;

    var srcDict, altDict;
    if (lang === 'es') { srcDict = DICT_EN2ES; altDict = DICT_ES2EN; }
    else               { srcDict = DICT_ES2EN; altDict = DICT_EN2ES; }

    // Fast path — exact
    if (srcDict[core]) return lead + srcDict[core] + trail;
    // If it's already in target language, leave it alone
    if (altDict[core]) return text;

    // Composite: try substring replacements from longest to shortest key
    // Only do this when text is short-ish (avoid huge minified strings — this
    // will only run on text nodes anyway, not attributes)
    if (core.length > 400) return text;
    var out = core;
    var changed = false;
    for (var i = 0; i < ENTRIES.length; i++) {
      var k, v;
      if (lang === 'es') { k = ENTRIES[i][0]; v = ENTRIES[i][1]; }
      else               { k = ENTRIES[i][1]; v = ENTRIES[i][0]; }
      if (!k || k.length < 4) continue; // avoid too-generic short words
      if (out.indexOf(k) !== -1) {
        // Replace all occurrences (escape regex)
        var esc = k.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&');
        out = out.replace(new RegExp(esc, 'g'), v);
        changed = true;
      }
    }
    return changed ? (lead + out + trail) : text;
  }

  // Walk one node and translate any text nodes underneath.
  function translateSubtree(root) {
    if (!root) return;
    if (root.nodeType === 3) { // TEXT_NODE
      var newVal = translateText(root.nodeValue);
      if (newVal !== root.nodeValue) root.nodeValue = newVal;
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    // Skip <script> and <style>
    if (root.nodeName === 'SCRIPT' || root.nodeName === 'STYLE') return;
    // Skip our own UI to prevent self-editing
    if (root.classList && root.classList.contains('lrv-lang-ui')) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE')) return NodeFilter.FILTER_REJECT;
        // don't touch our own UI
        while (p) {
          if (p.classList && p.classList.contains('lrv-lang-ui')) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      var nv = translateText(node.nodeValue);
      if (nv !== node.nodeValue) node.nodeValue = nv;
    }
  }

  // Global observer that translates as React renders.
  var observer;
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(function(muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') {
          var nv = translateText(m.target.nodeValue);
          if (nv !== m.target.nodeValue) m.target.nodeValue = nv;
        } else if (m.type === 'childList') {
          for (var k = 0; k < m.addedNodes.length; k++) {
            translateSubtree(m.addedNodes[k]);
          }
        }
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  }

  // Retranslate the whole document (used when the language is toggled)
  function retranslateAll() {
    translateSubtree(document.body);
  }

  // Public API — used by the language toggle UI (and any external caller)
  window.__lrvGetLang = function() { return lang; };
  window.__lrvSetLang = function(newLang) {
    if (newLang !== 'en' && newLang !== 'es') return;
    if (newLang === lang) return;
    lang = newLang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    retranslateAll();
    updateLangPill();
    // update <html lang="">
    document.documentElement.setAttribute('lang', lang === 'es' ? 'es' : 'en');
  };

  // ===== Floating language pill (top-right corner, always visible) =====
  var pill;
  function ensurePill() {
    // Floating language pill disabled — the language toggle lives only inside SYSTEM SETTINGS now.
    return;
    // (unreachable — kept below to preserve any external references)
    if (pill && document.body.contains(pill)) return;
    pill = document.createElement('div');
    pill.className = 'lrv-lang-ui lrv-lang-pill';
    pill.setAttribute('role', 'button');
    pill.setAttribute('tabindex', '0');
    pill.title = 'Language / Idioma';
    pill.innerHTML =
      '<span class="lrv-lang-icon" aria-hidden="true">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
             'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="12" cy="12" r="10"></circle>' +
          '<path d="M2 12h20"></path>' +
          '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>' +
        '</svg>' +
      '</span>' +
      '<span class="lrv-lang-code"></span>';
    pill.addEventListener('click', function(e) {
      e.stopPropagation();
      window.__lrvSetLang(lang === 'es' ? 'en' : 'es');
    });
    pill.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); e.stopPropagation();
        window.__lrvSetLang(lang === 'es' ? 'en' : 'es');
      }
    });
    document.body.appendChild(pill);
    updateLangPill();
  }
  function updateLangPill() {
    if (!pill) return;
    var codeEl = pill.querySelector('.lrv-lang-code');
    if (codeEl) codeEl.textContent = lang.toUpperCase();
  }

  // ===== Inline Language section inside SYSTEM SETTINGS =====
  // The React settings panel has an <h2>SYSTEM SETTINGS</h2>. We watch for it and
  // inject a "Language / Idioma" segmented control right below the header.
  var lastInjectedPanel = null;
  function injectLanguageSection() {
    // Find any h2 with SYSTEM SETTINGS text (in either language)
    var headers = document.querySelectorAll('h2');
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i];
      var t = (h.textContent || '').trim();
      if (t === 'SYSTEM SETTINGS' || t === 'AJUSTES DEL SISTEMA') {
        // walk up to the settings modal container
        var modal = h.closest('div.bg-slate-950\\\\/50') ? h.closest('div.bg-slate-950\\\\/50').parentNode : h.parentNode.parentNode;
        // Find the scrollable content panel (sibling with p-8 space-y-8)
        var content = modal.querySelector('.p-8.space-y-8') || modal.querySelector('[class*="space-y-8"]');
        if (!content) content = modal;
        if (lastInjectedPanel === content && content.querySelector('.lrv-lang-section')) return;

        // Build language section (matches the game's dark-tech aesthetic)
        var section = document.createElement('div');
        section.className = 'lrv-lang-ui lrv-lang-section';
        section.innerHTML =
          '<label class="lrv-lang-label">' +
            (lang === 'es' ? 'Idioma' : 'Language') +
          '</label>' +
          '<div class="lrv-lang-toggle">' +
            '<button type="button" data-code="en" class="lrv-lang-btn' + (lang === 'en' ? ' lrv-active' : '') + '">' +
              '<span class="lrv-lang-flag">EN</span>' +
              '<span>English</span>' +
            '</button>' +
            '<button type="button" data-code="es" class="lrv-lang-btn' + (lang === 'es' ? ' lrv-active' : '') + '">' +
              '<span class="lrv-lang-flag">ES</span>' +
              '<span>Español</span>' +
            '</button>' +
          '</div>';
        var btns = section.querySelectorAll('.lrv-lang-btn');
        for (var b = 0; b < btns.length; b++) {
          btns[b].addEventListener('click', function(ev) {
            ev.preventDefault();
            var code = this.getAttribute('data-code');
            window.__lrvSetLang(code);
            // Refresh active state
            var all = section.querySelectorAll('.lrv-lang-btn');
            for (var a = 0; a < all.length; a++) {
              if (all[a].getAttribute('data-code') === code) all[a].classList.add('lrv-active');
              else all[a].classList.remove('lrv-active');
            }
            var lbl = section.querySelector('.lrv-lang-label');
            if (lbl) lbl.textContent = (lang === 'es' ? 'Idioma' : 'Language');
          });
        }
        // Insert as the FIRST section inside the settings scroll area
        content.insertBefore(section, content.firstChild);
        lastInjectedPanel = content;
        return;
      }
    }
  }

  // Kick off once DOM is ready
  function boot() {
    document.documentElement.setAttribute('lang', lang === 'es' ? 'es' : 'en');
    // Floating corner pill removed — language toggle now lives only inside SYSTEM SETTINGS.
    translateSubtree(document.body);
    startObserver();
    // Poll for the settings modal opening
    setInterval(function() {
      injectLanguageSection();
    }, 400);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
</script>
<style>
  /* === Language UI === */
  .lrv-lang-pill {
    position: fixed;
    top: max(env(safe-area-inset-top, 0px), 10px);
    right: max(env(safe-area-inset-right, 0px), 10px);
    z-index: 2147483000;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: rgba(15, 23, 42, 0.85);
    color: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.35);
    border-radius: 999px;
    font-family: 'Orbitron', 'Rajdhani', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    transition: transform .15s ease, background .15s ease, border-color .15s ease;
    box-shadow: 0 4px 14px rgba(0,0,0,0.35);
  }
  .lrv-lang-pill:hover {
    transform: translateY(-1px);
    background: rgba(30, 41, 59, 0.9);
    border-color: rgba(148, 163, 184, 0.6);
  }
  .lrv-lang-pill .lrv-lang-icon {
    display: inline-flex; align-items: center; color: #67e8f9;
  }
  .lrv-lang-pill .lrv-lang-code { line-height: 1; }

  /* Section inside System Settings */
  .lrv-lang-section {
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid rgba(51, 65, 85, 0.6);
  }
  .lrv-lang-section .lrv-lang-label {
    display: block;
    font-size: 12px;
    font-family: 'Orbitron', 'Rajdhani', ui-monospace, monospace;
    color: #f472b6;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    margin-bottom: 10px;
  }
  .lrv-lang-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    background: #020617;
    padding: 6px;
    border: 1px solid #1e293b;
    border-radius: 12px;
  }
  .lrv-lang-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 12px;
    background: transparent;
    color: #94a3b8;
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: 0.05em;
    transition: background .12s ease, color .12s ease, border-color .12s ease;
  }
  .lrv-lang-btn:hover { color: #e2e8f0; background: rgba(30,41,59,.6); }
  .lrv-lang-btn.lrv-active {
    background: linear-gradient(180deg, rgba(244,114,182,0.18), rgba(139,92,246,0.18));
    color: #ffffff;
    border-color: rgba(244,114,182,0.55);
    box-shadow: 0 0 0 1px rgba(244,114,182,0.25) inset, 0 0 12px rgba(244,114,182,0.15);
  }
  .lrv-lang-flag {
    font-family: 'Orbitron', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 2px 6px;
    background: rgba(148,163,184,0.15);
    border-radius: 4px;
    color: #cbd5e1;
  }
  .lrv-lang-btn.lrv-active .lrv-lang-flag {
    background: rgba(244,114,182,0.28);
    color: #fff;
  }

  /* ==== Spanish text fit rules ====
     Spanish translations are on average ~20-30% longer than English. To avoid
     overflow inside menus, cards, and overlays, when <html lang="es"> we:
     - allow long words to break
     - slightly shrink Orbitron .font-tech uppercase titles so they still fit
       inside the same overlay containers */
  html[lang="es"] body { hyphens: auto; -webkit-hyphens: auto; }
  html[lang="es"] .font-tech,
  html[lang="es"] h1, html[lang="es"] h2, html[lang="es"] h3, html[lang="es"] h4 {
    word-break: break-word;
    overflow-wrap: anywhere;
    letter-spacing: 0.06em;
  }
  /* Scale the huge overlay titles so translated words like TRASCENDENCIA fit */
  html[lang="es"] .text-9xl { font-size: clamp(3rem, 12vw, 6.5rem) !important; line-height: 1.02 !important; }
  html[lang="es"] .text-8xl { font-size: clamp(2.5rem, 10vw, 5.5rem) !important; line-height: 1.05 !important; }
  html[lang="es"] .text-7xl { font-size: clamp(2rem, 8.5vw, 4.5rem) !important; line-height: 1.05 !important; }
  html[lang="es"] .text-6xl { font-size: clamp(1.75rem, 7vw, 3.75rem) !important; line-height: 1.1 !important; }
  html[lang="es"] .text-5xl { font-size: clamp(1.5rem, 5.5vw, 3rem) !important; line-height: 1.1 !important; }
  html[lang="es"] .text-4xl { font-size: clamp(1.25rem, 4.5vw, 2.25rem) !important; line-height: 1.15 !important; }
  html[lang="es"] .text-3xl { font-size: clamp(1.05rem, 3.8vw, 1.75rem) !important; line-height: 1.2 !important; }
  html[lang="es"] .text-2xl { font-size: clamp(0.95rem, 3vw, 1.4rem) !important; line-height: 1.25 !important; }

  /* Buttons often have padding + big text — keep them from overflowing */
  html[lang="es"] button, html[lang="es"] a { word-break: break-word; overflow-wrap: anywhere; }

  /* The pill itself: no shrinkage */
  .lrv-lang-pill, .lrv-lang-section { letter-spacing: 0.12em; }

  /* On phones, tuck the pill under the top-right HUD */
  @media (max-width: 640px) {
    .lrv-lang-pill { top: 8px; right: 8px; padding: 4px 8px; font-size: 11px; }
  }
</style>
`;

html = html.replace('      ::-webkit-scrollbar-thumb:hover {\n        background: #475569; \n      }', `      ::-webkit-scrollbar-thumb:hover {
        background: #475569; 
      }
${headStyleAddition}`);

html = html.replace('  </body>', `${bodyEndAddition}  </body>`);

fs.writeFileSync('index.html', html);
