
import React from 'react';
import { Text, ScrollView, Dimensions, Image, View, TextInput, FlatList, TouchableOpacity, Platform, AsyncStorage } from 'react-native'
import * as Device from 'expo-device'
import Navigator from './navigation/navigator'
import { createAppContainer } from 'react-navigation'
import publicIP from 'react-native-public-ip'
import AwesomeButton from "react-native-really-awesome-button"
import * as Network from 'expo-network';
import Home from './screens/home';
import reducers from './redux/reducers';
import thunkMiddleware from 'redux-thunk';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import createSocketIoMiddleware from 'redux-socket.io';
import io from 'socket.io-client'
import styles from "./styles"
import * as firebase from 'firebase'
import { Audio } from 'expo-av'
import {setZone, setUser, setIp, setAllZones} from './redux/actions'
import Constants from 'expo-constants'
import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: 'https://2b59c7ca02a844dca3841a771ae12c44@o492868.ingest.sentry.io/5606836',
  enableInExpoDevelopment: true,
  debug: true, // Sentry will try to print out useful debugging information if something goes wrong with sending an event. Set this to `false` in production.
});

// Access any @sentry/react-native exports via:
// Sentry.Native.*

// Access any @sentry/browser exports via:
// Sentry.Browser.*



const firebaseConfig = {
  apiKey: "AIzaSyBn3NMZ3iaoVuQrEoyY2ThAGFWTtOcM9po",
  databaseURL: "https://kitchen-display-9e099.firebaseio.com"
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig)
}

const AppNavigator = createAppContainer(Navigator)

export default class App extends React.Component {
  state = {
      zone: null,
      loggedIn: false,
      store: null,
      name: '',      
      password: '',
      errorLog: '',
      rememberMe: true,
    
  }  

  componentDidMount() {
    AsyncStorage.getItem("credentials").then(
        value => {
          if (value) {
            const cred = JSON.parse(value)
            this.setState({name: cred.name, password: cred.password}, () => {
              this.handleLogin()
            })
          }         
          
        }
    )
  }

  handleLogin =  () => {
    // let finalName, finalPassword
    // if (name) {
    //   finalName = name
    //   finalWo
    // }
    const name = this.state.name.trim()
    const password = this.state.password.trim()
    if (name !== "" && password !== "") {
      firebase.database().ref('users').child(name).once('value', snap => {
        if (snap.exists()) { 
          const user = snap.val()
          
          if (password === user.password) {  
            
            const credentials = {}
            credentials.name = name
            credentials.password = password
            AsyncStorage.setItem("credentials", JSON.stringify(credentials))
            // const obj = {}
            // obj.name = finalName
            // obj.password = finalePassword
            // AsyncStorage.setItem('credentials', JSON.stringify(obj))         
              this.getZone(user)            
          } else {
            this.setState({errorLog: 'Mot de passe incorrect'})
          }
        } else {          
          this.setState({errorLog: "Ce nom d'utilisateur n'existe pas"})
        }
      }) 
    }
  }

  launchServer = (user, zone, ip, allZones) => {
    // console.log(zone)
    // let socket = io('http://192.168.1.73:3000');
    // console.log(ip)
    // console.log(zone)
    const SocketEndpoint = user.serverUrl
    
    const socket = io(SocketEndpoint, {
      transports: ['websocket'],
    })
    // console.log(socket)
    let socketIoMiddleware = createSocketIoMiddleware(socket, "server/");
    
    socket.on("ring", async function(){
      // console.log("ho")   
      this.bell = new Audio.Sound();
      const bell = this.bell
      
        Audio.Sound.createAsync(
          require('./assets/bell.mp3'),
          { shouldPlay: true }
        ).then((res)=>{
          res.sound.setOnPlaybackStatusUpdate((status)=>{
            if(!status.didJustFinish) return;
            
            res.sound.unloadAsync().catch(()=>{});
          });
        })    
      })

    let store = applyMiddleware(socketIoMiddleware, thunkMiddleware)(createStore)(reducers);
    socket.on("connect", function() {
      // console.log("hi")
      store.dispatch({type:'server/sendZone', payload: zone.name})
      if (user.settings && user.settings.orderHistory) {
        store.dispatch({type:'server/sendSettingOrderHistory', payload: user.settings.orderHistory})
      }      
    })
    store.dispatch(setAllZones(allZones))
    store.dispatch(setZone(zone))
    store.dispatch(setUser(user))
    store.dispatch(setIp(ip))
    this.store = store
    this.setState({loggedIn: true})    
  }

  getZone = async (user) => {
    // const ip = await internalIp.v4()
    // console.log("ip", ip)
    
    const deviceName = Platform.OS == "ios" ? await Network.getIpAddressAsync() : await Network.getMacAddressAsync("wlan0")
    
   const allZones = Object.keys(user.zones).map((zoneKey) => {
      const zoneObj = user.zones[zoneKey]
      const allZone = {}
      allZone.name = zoneObj.name
      if (zoneObj.libellé) {
        allZone.libellé = zoneObj.libellé
      } 
      return allZone
    })
   
    Object.keys(user.zones).forEach((el) => {
      
      const zoneObject = {}
      const zone = user.zones[el].name
      zoneObject.name = zone
      
      if (user.zones[el].navV1 === true) {
        zoneObject.navV1 = true
      }
      
      if (user.zones[el].libellé) {
        zoneObject.libellé = user.zones[el].libellé
      }
      // const ips = user.zones[zone].ips
      // console.log(user.zones[zone].ips)

      
     
      let ips = Array.isArray(user.zones[zone].ips) ? 
      user.zones[zone].ips
      :
      Object.keys(user.zones[zone].ips).map((ipObj) => {   
          return user.zones[zone].ips[ipObj]  
      }) 
      
      ips = ips.filter((ip) => ip)


      const screenObj = ips.find(element => element.ip === deviceName || element === deviceName)
      
      if (screenObj) {
        if (Object.keys(screenObj).length > 0 && screenObj.constructor === Object) {
          if (screenObj.filters) {
            zoneObject.filters = screenObj.filters
          }
          
          // if (screenObj.filterMode) {
          //   const modeFilterArray = screenObj.filterMode.filter((element) => element && element != "")
          //   if (modeFilterArray.length > 0) {
          //     zoneObject.filterMode = modeFilterArray
          //   }          
          // }
          // if (screenObj.filterOrigine) {
          //   const origineFilterArray = screenObj.filterOrigine.filter((element) => element && element != "")
          //   if (origineFilterArray.length > 0) {
          //     zoneObject.filterOrigine = origineFilterArray
          //   }          
          // }  
          // if (screenObj.filterStatus) {
          //   const statusFilterArray = screenObj.filterStatus.filter((element) => element && element != "")
          //   if (statusFilterArray.length > 0) {
          //     zoneObject.filterStatus = statusFilterArray
          //   }          
          // } 
          if (screenObj.isSortie) {
            zoneObject.isSortie = true
          }           
        }
        this.launchServer(user, zoneObject, deviceName, allZones)  
      } 
      

      
    })    
  }

  renderLogin = () => {    
  return(
    <View style={{alignItems: "center", marginTop: 10}}>
      <TextInput
        style={styles.inputLog}
        value={this.state.name}
        onChangeText={name => this.setState({ name })}
        placeholder="Login"
        autoCapitalize='none'
        
      />
      <TextInput
        style={styles.inputLog}
        value={this.state.password}
        onChangeText={password => this.setState({ password })}
        placeholder='Mot de passe'            
        
      />
      <AwesomeButton  style={{marginTop: 20}} onPress={this.handleLogin}>Connexion</AwesomeButton>  
      <Text style={{marginTop: 20, color: "black"}}>{this.state.errorLog}</Text>
    </View>
  )
}
  render() {
    // console.log(this.state.loggedIn)
    if (this.state.loggedIn === false) {
      return(
        <View styles={{flex: 1}}>
          {this.renderLogin()}
        </View>
      )           
    } else {
        return (
          
          <Provider store={this.store}>            
               <AppNavigator/>         
          </Provider>
        );
      }
    }    
}






