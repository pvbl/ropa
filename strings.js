const deepFreeze = require('deep-freeze');









const general = {
  "ListIsEmpty":"no quedan mas productos.",
  /** Used to give responses for no inputs */
  "noInputs": [
    "Lo siento, no te he escuchado.",
    "Repiteme por favor",
    "Sigues interesado en comprar moviles?"
  ],
  "apisearchError":[
  'Tenemos problemas ahora con el catalogo de producto. Intentelo mas tarde',
  'Tengo problemas con el catalogo. Intentelo luego mas tarde'
  
  ],
  "singInError":[
  "Lo siento, tenemos problemas para autentificarte",
  "Ahora mismo no conseguimos validar tus credenciales"
  
  ],
  "apistockError":[
  "Lo siento pero ahora mismo no puedo localizar donde tenemos stock. Intentalo en breves mas tarde",
  "Lo siento pero no puedo ahora mismo encontrar la localizacion"
  
  ],
  "singInSuccess":[
  "Perfecto. Actualmente se encuentra usted logueado",
  "Bien, ya tenemos sus datos para enviarle el mail."
  ],
  "UserLocationError":[
  "Lo siento, no puedo localizarte. Intentalo mas tarde",
  'Lo siento, no puedo encontrar donde estas.',
  'Lo siento, no puedo acceder a tu localizacion actual.'
  
  ],
  "askForCPPermission":["Para ver cual de las tiendas mas cercanas tiene Stock",
  "Para determinar que Corte Ingles mas cercano tiene Stock del producto"
  ],
  'welcome' : {
	"main": ["Bienvenido al Corte Ingles <audio src=\"%s\"></audio>",
	"Buenos dias desde el Corte. ¿En que puedo atenderle? <audio src=\"%s\"></audio>",
	"Aqui el asistente de El Corte Ingles. ¿En que puedo atenderle?<audio src=\"%s\"></audio>"],
	"loggeduser":["Buenos dias %s. Bienvenido al corte Ingles! En que puedo atenderte?<audio src=\"%s\"></audio> ",
	"Bienvenido a El Corte Ingles. En que puedo atenderte %s?<audio src=\"%s\"></audio>",
	"Hola %s. Bienvenido a El Corte! Como puedo ayudarte?<audio src=\"%s\"></audio>"
	],
	"audio": "https://upload.wikimedia.org/wikipedia/en/2/29/Cello_Sonata%2C_Mvt._4_-_Rachmaninoff.ogg"
	
},

  "nextItems": "Quiere ver los items posteriores?",
  "prevItems": "Quieres ver los items anteriores?",
  "linkOut": "Mas informacion",
  "wantWhat": "Que es lo que te gustaria que hiciesemos?",
  "unhandled": "Bienvenido a El Corte. Quiere saber sobre ofertas?"
};

const searchItems ={
    "ask": ['Cual de estos productos le parece mas interesante? %s' 
    ],
    "carouselTitle":'Moviles' ,
    "specialOffersMain": {
   "ask": ["Tenemos en oferta los siguientes terminales: %s, ¿cual te parece más interesante? el primero, segundo o tercero",
   "Nuestras mejores ofertas son: %s. ¿Quieres saber mas informacion sobre el primero, segundo o tercero?",
   "Tenemos en nuestro catalogo %s. ¿Quieres saber mas sobre el primero segundo o tercero?"
   ],
   "carouselTitle":'Moviles'   
   }
}





const transitions = {
  "goBackToList":{
	"ask":[ 'Volvamos a la lista. %s. Le interesa el primero, segundo o tercero?',
	'En la lista tenemos %s. Quiere mas informacion del primero, segundo o tercero?'
	],
	"carouselTitle":'Moviles' 
}
  
};


const ItemData = {
	"features": ['Las caracteristicas son %s',
    '%s'
    ],
    "ask": ['Tenemos el %s a un precio único de de %s',
    'Existe el %s a %s',
    'Hay el %s a %s'  
    ],
    "sendInfo":[
    "acabamos de enviarle un mail a %s con la informacion del producto. Agradecemos su interes",
	"La informacion de tu pedido se ha enviado a %s. Muchas gracias por confiar en El Corte Ingles",
	"Hemos enviado un enlace al producto a %s. Esperamos que su experiencia haya sido agradable.",
	"Le hemos enviado a %s un enlace con el producto seleccionado" 
	],
	 "singleItemOption": {
   "description": "%s a %s. Mas informacion en %s"
    }

}



const dateObjects = {
	"getCurrentHour":"Son las % horas y %s minutos",
	"getCurrentDate":"Son las % horas del dia %s de %s"
}




// Use deepFreeze to make the constant objects immutable so they are not unintentionally modified
module.exports = deepFreeze({
  general,
  searchItems,
  transitions,
  ItemData,
  dateObjects
});
