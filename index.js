// Copyright 2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';



const request = require('request');
const strings = require('./strings');
process.env.DEBUG = 'actions-on-google:*';
const { DialogflowApp } = require('actions-on-google');
const { sprintf } = require('sprintf-js');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const mailer = require("nodemailer");
const moment = require('moment');
moment.locale('es');
const NodeGeocoder = require('node-geocoder');


// Diccionario con las acciones que vamos a utilizar.
const Actions = {
  UNRECOGNIZED_DEEP_LINK: 'deeplink.unknown',
  PRODUCT_SEARCH: 'product.search',
  SPECIAL_OFFERS: 'product.search.specialoffers',
  SPECIAL_OFFERS_SELECTION: "product.search.specialoffers.selection",
  PRODUCT_SEARCH_FEATURES_SELECTION:'product.search.specialoffers.selection.features',
  PRODUCT_SEARCH_SELECTION_GOBACK:"product.search.specialoffers.selection.goback",
  PRODUCT_SEARCH_SELECTION_SENDINFO:"product.search.specialoffers.selection.sendinfo",
  PRODUCT_SEARCH_SELECTION_STOCKREQUEST:"product.search.specialoffers.selection.stockreq",
  PRODUCT_SEARCH_SELECTION_STOCKRESPONSE:"product.search.specialoffers.selection.stockres",
  SPECIAL_OFFERS_NEXT: "product.search.specialoffers.next",
  SPECIAL_OFFERS_PREV: "product.search.specialoffers.previous",
  CURRENT_TIME:'smalltalks.current.time',
  CURRENT_DATE:'smalltalks.current.date',
  WELCOME: 'input.welcome',
  //FALLBACK_X3:'input.unknown.x3.sendtospecialoffers',
  SIGN_IN : 'sign.status',
  REQUEST_SIGN_IN : 'sign.request',
  ASK_LOCATION:'ask.location',
  SHOW_LOCATION:'show.location'

};


// Parametros que vamos a extraer de Dialogflow
const Parameters = {
  ITEM:'item',
  FEATURES:'features-general',
  CONTACT:'contact'

}

/** Dialogflow Contexts {@link https://dialogflow.com/docs/contexts} */
const Contexts = {
  SPECIAL_OFFERS_SELECTION: 'productsearchspecialoffers-selectnumber-followup'
  
};

/** Dialogflow Context Lifespans {@link https://dialogflow.com/docs/contexts#lifespan} */
const Lifespans = {
  DEFAULT: 5,
  END: 0
};





var mappers_number = {"1":"primero","2":"segundo","3":"tercero"};

var mappers_features= {'RAM':'Memoria RAM',
'pantalla':'Tamaño de pantalla',
'camara':'Resolución cámara trasera (principal)',
'procesador':'Tipo de procesador',
'precio':'price'}







// Levantamos el servidor con el que vamos a trabajar
const server = express();
server.use(bodyParser.urlencoded({
    extended: true
}));

server.use(bodyParser.json());


/**
 * Set up app.data for use in the action
 * @param {DialogflowApp} app DialogflowApp instance
 */
const initData = app => {
  /** @type {AppData} */
  const data = app.data;
  if (!data.search) {
    data.search = {
      parameters: {},
      href:null
    };
  }
  if (!data.user) {
    data.user = {
      id: null,
      name:null,
      given_name:null,
      email:null
    };
  }
  
  return data;
};





/**
 * @template T
 * @param {Array<T>} array The array to get a random value from
 */
const getRandomValue = array => array[Math.floor(Math.random() * array.length)];






/**
 * Convert Item from db JSON  to Dialogflow JSON
 * 
 * @constructor
 *
 * @param {DialogflowApp} app DialogflowApp 
 * @param {Map<String} item JSON with data of the DB.
 * @return {DialogflowApp.Item} 
 */
const OptionItemFromJson = (app,item) =>{
	var name = item.name;
	var price = item.price;
	var href = item.href;
	var image = item.image;
	
    return app.buildOptionItem(href,[name, (item.index + 1 ).toString() , mappers_number[(item.index + 1).toString()]])
      .setTitle(name)
      .setDescription(sprintf(strings.ItemData.singleItemOption.description, name, price, href))
      .setImage(image, name); 
}

const items_to_carousel = (app,items_json) => {
    return items_json.map(item => OptionItemFromJson(app,item));
}








/**
 * Extracts data from the db 
 * devuelve mediante la funcion callback una respuesta asociada a los datos de la base de datos
 * 
 * @constructor
 *
 * @param {DialogflowApp} app DialogflowApp 
 * @param {function} callback function(app,bodyAPI) that works with the output of the db.
 * @param {Map<string} options JSON used to extract data from the db.
 * @return {void}
 */
const GetDataFromWebhook = (app,callback,options) => { 
            
 
      request(options, function (errorAPI, responseAPI, bodyAPI) {
		  console.log(errorAPI)
        if (!errorAPI && responseAPI.statusCode == 200) {
			console.log("calling API...");
            callback(app,bodyAPI);

        } else { 
            app.tell(getRandomValue(strings.general.apisearchError));
            
            }; 
      });
};






/**
 * Extracts multiple Items from the webhook (ECI)
 * and returns a response asociated with them for DialogFlow.
 * 
 * @constructor
 *
 * @param {DialogflowApp} app DialogflowApp 
 * @param {function} callback function(app,bodyAPI) that works with the output of the db.
 * @param {Map<string} options JSON used to extract data from the db.
 * @return {void}
 */
const GetMultipleItemsDataFromWebhook = (app,callback,parameters) => { 
	var options = {
                uri: 'https://search-eci.herokuapp.com/searcheci',
                method: 'POST',
                json: {
                  'result': {
                    'parameters': parameters
			  
                    
                  }
              }
        };
	
	GetDataFromWebhook(app,callback,options)
	
	
}





/**
 * Extracts a simple Item from the webhook (ECI)
 * and returns a JSON response for DialogFlow.
 * 
 * @constructor
 *
 * @param {DialogflowApp} app DialogflowApp 
 * @param {function} callback function(app,bodyAPI) that works with the output of the db.
 * @param {Map<string} options JSON used to extract data from the db.
 * @return {void}
 */
const GetItemDataFromWebhook = (app,callback,parameters) => { 
	var options = {
                uri: 'https://search-eci.herokuapp.com/returnItem',
                method: 'POST',
                json: {
                  'result': {
                    'parameters': parameters
			  
                    
                  }
              }
        };
	
	GetDataFromWebhook(app,callback,options)
	
	
}





/**
 * Returns the Special Offers as Dialogflow JSON.
 * 
 * @constructor
 *
 * @param {DialogflowApp} app DialogflowApp
 * @param {Int} movement (1,2,3,...) next 3 items. (-1,-2,...) previous 3 items.  
 * @return {void}
 */
const specialOffersMain = (app,movement) => {

   const data = initData(app);
   
   const parameters = {
			"item":"",
			"category":"moda",
			"subcategory":"",
			"helper_search":"mujer",
			"limit":3
                  }
    
	const init_item=data.search.parameters.init_item;
	if (init_item!=null){
		
		const traslation = ((init_item + movement*3) >= 0)? (init_item + movement*3): 0
		parameters.init_item = traslation;
	}
   data.search.parameters= parameters;          
   const carousel = (app,bodyAPI) => {
	    const itemsCarousel = items_to_carousel(app,bodyAPI);
	    var names = itemsCarousel.map(item => item['title']);
	    names = names.slice(0, -1).join(',')+' o '+names.slice(-1);
	    
        app.askWithList(sprintf(getRandomValue(strings.searchItems.specialOffersMain.ask),names),
        app.buildList(strings.searchItems.specialOffersMain.carouselTitle)
        .addItems(itemsCarousel)
         );
     };
   GetMultipleItemsDataFromWebhook(app,carousel,parameters);
}





const getUserLoggedInformation = (app,callback,token) => {
	let options = {
        method: 'GET',
        url: 'https://www.googleapis.com/oauth2/v1/userinfo', 
        headers:{
            authorization: 'Bearer ' + token,
        }
    };
    const dataAPP = initData(app);
    

    request(options, (error, response, body) => {
		
        if (!error && response.statusCode == 200){   
            let dataID = JSON.parse(body); //Store the data we got from the API request
            dataAPP.user = dataID
            
            //console.log("usuario " + data.user.given_name + " autenticado")
            callback(app,dataID);
        }
        else{
			console.log("Error en la autentificacion")
            app.ask(getRandomValue(strings.general.singInError));
        }
    });
	
}



const LatLong2Adress = (latitude,longitude) =>{
	
	var options = {
	  provider: 'google',
	  httpAdapter: 'https', 
	  apiKey: 'AIzaSyCHii53cpcEyatEPKr_9oJ89suXl1v0OGQ',
	  formatter: null    
	};

	var geocoder = NodeGeocoder(options);

	geocoder.reverse({lat:latitude, lon:longitude}, function(err, res) {
	  console.log(res);
	});
	
	
}



const GetDataFromResultAPIstock = (app,bodyAPIStock) => {
	const provinceName = bodyAPIStock['provinces_eci'][0]['province_name']
	const stores = bodyAPIStock['provinces_eci'][0]['stores']
	const stockStores = stores.filter(x=>x['physical_stock']==true)
	if (stockStores.length){
		app.ask("En " + provinceName + " tenemos " + stores.length +" tiendas con el producto disponible")
		
	}
	else {
		app.ask("Lo sentimos pero no hay centros cercanos con stock disponible")
	}
	// dado que estamos hablando de distancias pequenas, podemos aproximar
	//const distances = stockStores.map(x=>Math.pow(x['longitude']-userLongitude,2)+Math.pow(x['latitude']-userLatitude,2))
	//var indexOfMinValue = distances.reduce((iMin, x, i, arr) => x < arr[iMin] ? i : iMin, 0);
	//stores[indexOfMinValue]
    
}




const GetDataFromAPIstock = (app,callback,properties) => { 
	    var url = "https://api.elcorteingles.es/ecommerce/centres";
        //var properties={"eciReference":"A22954940","locale":"es_ES","provinceECI":28};

		request({url:url, qs:properties}, function(errorAPIstock, responseAPIstock, bodyAPIstock) {
		  
        if (!errorAPIstock && responseAPIstock.statusCode == 200) {
			console.log("calling API...");
			var bodyAPIstockJson = JSON.parse(bodyAPIstock)
            //callback(app,bodyAPIstockJson);
            GetDataFromResultAPIstock(app,bodyAPIstockJson)
            

        } else { 
            app.ask(getRandomValue(strings.general.apistockError));
            }; 
      });
};










/**
 * Join items in list for Spanish vocabulary Ej:(x,y and z)
 * 
 * @constructor
 *
 * @param {List} list of names 
 * @param {main_separator} separator between elements
 * @param {last_separator} separator between las two elements
 * @return {String}
 */
const JoinItemsFromListToString = (list,main_separator=', ',last_separator='o') =>{
	 return list.slice(0, -1).join(main_separator) + ' ' + last_separator + ' ' + list.slice(-1);
	
}




// Return numbers in strings
const FindNumberInString = (string) => {
	
	return string.replace(/\D/g, '');
}





/**
 * get 1 item from the API and return the description and price of it.
 * 
 * @constructor
 *
 * @param {DialogflowApp} app DialogflowApp 
 * @return {void}
 */
   
const getItemWebhook = (app,href) => {
	const data = initData(app);   
	data.search.href= href;
	
	//let item = app.getArgument(Parameters.FEATURES);
   const parameters = {
                  'href': href
                  }
   const showItem = (app,bodyAPI)=>{
	   
	   var name = bodyAPI['name'];
	   var description = bodyAPI['description'];
	   var price = bodyAPI['price'];
	   var href = bodyAPI['href'];
	   var image = bodyAPI['img'];
	   
	   app.ask(app.buildRichResponse()
		.addSimpleResponse(sprintf(getRandomValue(strings.ItemData.ask),name,price))
		.addBasicCard(app.buildBasicCard(description)
		  .setTitle(name)
		  .addButton('Más información', href)
		  .setImage(image, name)
		  .setImageDisplay('CROPPED')
		   )
	  )
	   
   }
   
   GetItemDataFromWebhook(app,showItem,parameters);
}










const specialOffers = app => {
	specialOffersMain(app,0)
	
}

const specialOffersNext = app => {
	specialOffersMain(app,1)
	
}

const specialOffersPrev = app => {
	specialOffersMain(app,-1)
	
}








/**
 * search Items in the App and return a carousel with them.
 * 
 * @constructor
 *
 * @param {DialogflowApp} app DialogflowApp 
 * @return {void}
 */

const searchItems = app => {
   let item = app.getArgument(Parameters.ITEM);
   const parameters = {
                  'item': item,
                  'limit':3
                  }
   const carousel = (app,bodyAPI) => {
	   const itemsCarousel = items_to_carousel(app,bodyAPI);
	   var names = itemsCarousel.map(item => item['name'])
	   names = JoinItemsFromListToString(names)
	           
        app.askWithList(sprinf(getRandomValue(strings.searchItems.ask),name),
        app.buildList(strings.searchItems.carouselTitle)
        .addItems(itemsCarousel)
         );
     };
   GetMultipleItemsDataFromWebhook(app,carousel,parameters);
}









/**
 * pick item from list.
 * 
 * @constructor
 *
 * @param {DialogflowApp} app DialogflowApp 
 * @return {void}
 */
const optionPicked = app => {
  let href = app.getSelectedOption();
  getItemWebhook(app,href)
}




/**
 * go back from item to the list.
 * 
 * @constructor
 *
 * @param {DialogflowApp} app DialogflowApp 
 * @return {void}
 */
const goBackToList = app => {
   const data = initData(app); 
   let parameters = data.search.parameters;

   const carousel = (app,bodyAPI) => {
	   const itemsCarousel = items_to_carousel(app,bodyAPI);
	   var names = itemsCarousel.map(item => item['name'])
	   names = JoinItemsFromListToString(names)
	           
        app.askWithList(sprintf(getRandomValue(strings.transitions.goBackToList.ask),name,price),
        app.buildList(strings.transitions.goBackToList.carouselTitle)
        .addItems(itemsCarousel)
         );
     };
   GetMultipleItemsDataFromWebhook(app,carousel,parameters);
}






/**
 * get 1 item from the API (by HREF) and return .
 * 
 * @constructor
 *
 * @param {DialogflowApp} app DialogflowApp 
 * @return {void}
 */
   
const getItemFeatures = app => {
	const data = initData(app);   
	let href = data.search.href;
	let featuresRequest = app.getArgument(Parameters.FEATURES); // List of features that are going to be include in the data
	//var featuresRequest = ['Memoria RAM','Tamaño de pantalla','Resolución cámara trasera (principal)','Tipo de procesador']

   
   const parameters = {
                  'href': href
                  }
   const showItem = (app,bodyAPI)=>{
	   var name = bodyAPI['name'];
	   var features = bodyAPI['features'];
	   var description = bodyAPI['description'];
	   var href = bodyAPI['href'];
	   var image = bodyAPI['img'];
	   var price = bodyAPI['price'];
	   var info_model = (features['Gama modelo']) ? features['Gama modelo'] : name ;
	   featuresRequest = featuresRequest.map(feature => mappers_features[feature]);
	   var features_string = featuresRequest.map(feature=> (feature in features) ? feature+ ' es ' + features[feature] : '')
	   if ('price' in featuresRequest) { features_string=features_string.concat(['El precio es'+ price])}
	   if (features_string.length>1){
	    features_string = JoinItemsFromListToString(features_string,', ','y');
       }
       else{
		   features_string =features_string[0]
	   }
	   
	   app.ask(app.buildRichResponse()
		.addSimpleResponse(sprintf(getRandomValue(strings.ItemData.features),features_string))
		.addBasicCard(app.buildBasicCard(description)
		  .setTitle(name)
		  .addButton('Más información', href)
		  .setImage(image, name)
		  .setImageDisplay('CROPPED')
		   )
	  )   

   }
   
   GetItemDataFromWebhook(app,showItem,parameters);
}





/**
 * returns the JSON for Dialogflow with the current hour.
 * 
 * @constructor
 *
 * @param {DialogflowApp} app DialogflowApp 
 * @return {void}
 */
   
const getCurrentHour = app => {
	
	 var now = moment();
    
    now.locale(false);
    var hour = now.hour();
    var min  = now.minutes();
    

    app.tell(sprintf(strings.dateObjects.getCurrentHour,hour,min));


}




/**
 * returns the JSON for DiagloFlow with the current date.
 * 
 * @constructor
 *
 * @param {DialogflowApp} app DialogflowApp 
 * @return {void}
 */

const getCurrentDate = app => {
	
	var now = moment();
    now.locale(false);
    var hour = now.hour();
    var month = moment.months()[now.month()];
    var day  = now.day();
    
    var weekday = moment.weekdays()[day]    

    app.tell(sprintf(strings.dateObjects.getCurrentDate,hour,min));

	
}






/**
 * welcome intent
 * 
 * @constructor
 *
 * @param {DialogflowApp} app DialogflowApp 
 * @return {void}
 */
const welcome = app => {
    var main_string=""
    
	//if (app.getSignInStatus() === app.SignInStatus.OK) {
		let accessToken = app.getUser().accessToken;
		/// Hay que hacer un wait y cuando este el getuserLOggedInfo, lo otro
	if (accessToken){
		const welcomeLogged = app => {
		   let name = app.data.user.given_name ? app.data.user.given_name  : ""
		   main_string = sprintf(getRandomValue(strings.general.welcome.loggeduser), name, strings.general.welcome.audio);
		   app.ask(`<speak>${main_string}</speak>`)
		}
        getUserLoggedInformation(app,welcomeLogged,accessToken);
      }
    else {
	    main_string = sprintf(getRandomValue(strings.general.welcome.main), strings.general.welcome.audio);
	    app.ask(`<speak>${main_string}</speak>`)
	}
	
	
}




/**
 * Send mail with data when the user wants to know more about a product.
 * 
 * @constructor
 *
 * @param {DialogflowApp} app DialogflowApp 
 * @return {void}
 */

const sendInfo = app => {
	const data = initData(app);
	// se crea funcion y se envia email con datos, 
	// ponemos contacto en caso de que un futuro fuese movil u otro tipo
	// sendemail(contact,href)
	let email = data.user.email;
	//if (app.getSignInStatus() === app.SignInStatus.OK) {
	if (email){
		  
		  app.tell(sprintf(getRandomValue(strings.ItemData.sendInfo),email)); 
		  app.setContext(Contexts.SPECIAL_OFFERS_SELECTION, Lifespans.END, {});
    }
    else {
		app.askForSignIn();
	}

	
}

// Por si usuario pide autenticarse
const requestForSignIn = app => {
	 app.askForSignIn();
}






const signIn = app => {
  if (app.getSignInStatus() === app.SignInStatus.OK) {
    let accessToken = app.getUser().accessToken;
    const singInInfo = app => {
		app.ask(getRandomValue(strings.general.singInSuccess));
	}
    getUserLoggedInformation(app,singInInfo,accessToken)
    
  } else {
    app.ask(getRandomValue(strings.general.singInError));
  }
}











const showAPIstockInfo = (app) => {
	const data = initData(app);
	//var itemID = data.search.href;
	//itemID = url.split('/')[4].split('-')[0]
	//var itemID = '001057063411417009'
	if (app.isPermissionGranted()) {
		//const address = app.getDeviceLocation().address;
		            
			//app.tell(`Estas en ${address}`);
			data.user.location= app.getDeviceLocation()
			var dtout= JSON.stringify(app.getDeviceLocation());
			console.log(app.getDeviceLocation())
			app.ask(dtout)
		
		
			// Note: Currently, precise locaton only returns lat/lng coordinates on phones and lat/lng coordinates 
			// and a geocoded address on voice-activated speakers. 
			// Coarse location only works on voice-activated speakers.
			
		
	} else {
		app.ask(getRandomValue(strings.general.UserLocationError));
	}
}





const requestLocation = (app) => {
  app.askForPermission(getRandomValue(strings.general.askForCPPermission), app.SupportedPermissions.DEVICE_PRECISE_LOCATION);
};








const getECILocation = ()=>{//(app) => {
	ItemID='A20850368'
	postCode='28'
	//var ItemId = app.getArgument(Parameters.ItemId)
	//var postCode = app.getArgument(Parameters.postCode)
	const locale = "es_ES";
	if (postCode.length != 5){
		app.tell("el codigo postal es invalido")
		// hay que reenviar el contexto y eliminar cp
	}
	//const provinceECI = postCode.slice(0,2)
	var properties={"eciReference":ItemId,"locale":locale,"provinceECI":provinceECI}
    GetDataFromAPIstock(app,console.log,properties)
    //GetDataFromAPIstock(app,callback,properties)


}













const actionMap = new Map();
actionMap.set(Actions.SPECIAL_OFFERS, specialOffers);
actionMap.set(Actions.SPECIAL_OFFERS_NEXT, specialOffersNext);
actionMap.set(Actions.SPECIAL_OFFERS_PREV, specialOffersPrev);
actionMap.set(Actions.PRODUCT_SEARCH, searchItems);
actionMap.set(Actions.SPECIAL_OFFERS_SELECTION, optionPicked);
actionMap.set(Actions.PRODUCT_SEARCH_SELECTION_GOBACK, goBackToList);
actionMap.set(Actions.PRODUCT_SEARCH_FEATURES_SELECTION, getItemFeatures);
actionMap.set(Actions.PRODUCT_SEARCH_SELECTION_SENDINFO,sendInfo);
actionMap.set(Actions.PRODUCT_SEARCH_SELECTION_STOCKREQUEST,requestLocation);
actionMap.set(Actions.CURRENT_DATE, getCurrentDate);
actionMap.set(Actions.CURRENT_TIME, getCurrentHour);
actionMap.set(Actions.WELCOME, welcome);
actionMap.set(Actions.SIGN_IN, signIn);
actionMap.set(Actions.ASK_LOCATION, requestLocation);
actionMap.set(Actions.SHOW_LOCATION, showAPIstockInfo);
actionMap.set(Actions.REQUEST_SIGN_IN,requestForSignIn);





server.post('/searcheci', function (req, res) {
    //let movieToSearch = req.body.result && req.body.result.parameters && req.body.result.parameters.movie ? req.body.result.parameters.movie : 'The Godfather';
    const app = new DialogflowApp(({request: req, response: res})); 
    
    app.handleRequest(actionMap);
});





server.listen((process.env.PORT || 8000), function () {
    console.log("Server is up and running...");
});











