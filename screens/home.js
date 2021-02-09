import Expo from 'expo';
import React, {Component, PureComponent} from 'react'
import { Text, ScrollView, Dimensions, StatusBar, Image, View, TextInput, FlatList, TouchableOpacity, Platform } from 'react-native';
const io = require('socket.io-client');
import * as Network from 'expo-network';
import styles from "../styles"
import AwesomeButton from "react-native-really-awesome-button"
import moment from 'moment'
import * as ScreenOrientation from 'expo-screen-orientation';
import Swiper from 'react-native-swiper'
import Keyboard from "@junctiontv/react-native-on-screen-keyboard"
import OrderCard from '../containers/orderCard'
import {setOrders, getLastOrders, removeReceived, changeImages} from '../redux/actions'
import { connect } from 'react-redux'
import * as firebase from 'firebase'


const {width, height}= Dimensions.get('window')
const androidHeight = Dimensions.get('screen').height

 class Home extends PureComponent { 
    state = {       
      orderNum: null,
    }

    componentDidMount() { 

      firebase.database().ref('users').child(this.props.user.name).child('imagesV2').on('value', snap => {
        this.props.dispatch(changeImages(snap.val()))
        
      })

      let now = new Date().getTime()
      
      this.setState({now: now})
      setInterval(() => {          
          let newNow = new Date().getTime()
          
          // console.log(now)
          this.setState({now: newNow})
        }, 10000)
    }

  renderSwiper = () => {
    const user = this.props.user 

    if (user.imagesV1){
        const sliderViews = []
    
     user.imagesV1.forEach((url, i) => {
      const view =
      <View key={i}>
        <Image          
          style={styles.sliderImage}        
          source={{
            uri: url,
          }}
        />
      </View>
      sliderViews.push(view)
    })
    
    return(
      <View style={[styles.cardDemo]}>
        <Swiper autoplay={true}>               
            {sliderViews}    
        </Swiper>  
      </View>        
     
    )
    }    
  }
  toOrderedArray = (orders) => {
    return Object.keys(orders)
    .map((orderKey) => orders[orderKey])
}

  renderSalleV1 = () => {
    const adjust= Platform.OS === "ios" ? 0 : StatusBar.currentHeight
    const images = this.props.user.imagesV2
    const sliderViews = []
    this.props.user.imagesV2.forEach((url, i) => {
      const view =
      <View key={i}>
        <Image          
          style={{width: androidHeight - adjust, height: undefined, aspectRatio: 1 / 1}}      
          source={{
            uri: url,
          }}
        />
      </View>
      sliderViews.push(view)
    })
  
    return(
      <View style={{flex: 1, marginTop: adjust}}>
        <View style={{ flexDirection: "row"}}>
          <Swiper style={{height: androidHeight - adjust}} autoplay={true} autoplayTimeout={6} showsPagination={false}>
            {sliderViews}
          </Swiper>
          {/* <View style={{width: width - height, backgroundColor: "black", height: 100}}></View> */}
          {this.renderRightPartV1(adjust)}
          
          
            
      </View>
      {/* <Image style={styles.footer} source={require('../assets/footer.jpg')}></Image> */}
    </View>
    )
      
    // if (Object.keys(this.props.orders).length === 0) {
        
    //   return(
    //     <View style={[ styles.containerSalle, styles.center]}>
    //       <Text style={{color: "white", textAlign: 'center'}}>Pas de commandes prêtes à être servies actuellement</Text>
    //       {this.renderSwiper()}
    //     </View>
        
    //   )
    // } 
    // const ordersArray = this.toOrderedArray(this.props.orders)
    // // console.log("array", ordersArray)
    // return(      
    //   <View style={[styles.containerSalle, {paddingTop: height / 10, alignItems: "center"}]}>  
    //     <Text style={[styles.textColor, styles.bigText]}>COMMANDES PRÊTES A ÊTRE SERVIES</Text>
    //     <View style={{ borderBottomColor: 'white', marginBottom: height / 20, borderBottomWidth: 1, width: width / 2.5, marginTop: width / 50 }}/>   

    //     {ordersArray.map((order) => {                 
    //       return (          
    //         <View key={order.id}><Text style={styles.orderNumbers}>{order.id}</Text></View>     
    //       )
    //     })}
    //     {this.renderSwiper()}
    //   </View>
    //   )   
  }

  renderCaredOrdersV2 = () => {    
    const settings = this.props.user.settings || {}
    const mainColor = settings.mainColor || "#FED602"
    const secondColor = settings.secondColor  || "#231F20"
    const sortedArray = this.props.caredOrders
    
    const text = sortedArray.length < 2 ? "commande" : "commandes"
    const textColor = settings.subTextColor || "white"
    let filteredArray = [...sortedArray]
        const filters = this.props.zone.filters
        // console.log("filters", filters)
        if (filters) {
            filteredArray = filteredArray.filter((order) => {
                // console.log("isTrue", (!filter.mode || filter.mode == "" || filter.mode == order.mode) && (!filter.origine || filter.origine == "" || filter.origine == order.origine)&& (!filter.status || filter.status == "" || filter.status == order.status))
                return filters.some((filter) => {
                    return (!filter.mode || filter.mode == "" || filter.mode == order.mode) && (!filter.origine || filter.origine == "" || filter.origine == order.origine)&& (!filter.status || filter.status == "" || filter.status == order.status)
                })                
            })
        }

    const slicedArray = filteredArray.slice(Math.max(sortedArray.length - 5, 0))
    // console.log("sliced", slicedArray)
    return(      
      <View style={{flex: 1, alignItems: "center"}}>  
      <View style={{width: "100%", height: height / 6.5, alignItems: "center", borderRightWidth: 1, borderColor: "grey", justifyContent: "center", backgroundColor: secondColor}}>
        <Text style={[{color: mainColor, fontWeight: 'bold', textAlign: "center", fontSize: height / 15}]}>EN COURS</Text>
        <Text style={{fontWeight: "bold", color: textColor}}>{sortedArray.length} {text}</Text>
      </View>
        {/* <View style={{ borderBottomColor: 'white', marginBottom: height / 20, borderBottomWidth: 1, width: width / 2.5, marginTop: width / 50 }}/>    */}

        {slicedArray.map((order) => {
          let image
          if (order.origine === "caisse") {
            image = <Image style={{height: height / 13, width: height / 13}} source={require('../assets/picto-caisse.png')}></Image>

          } else if (order.origine === "borne") {
            image = <Image style={{height: height / 11, width: undefined, aspectRatio: 52 / 95}} source={require('../assets/picto-borne.png')}></Image>

          } else if (order.origine === "UberEats") {
            image = <Image style={{height: height / 13, width: height / 13}} source={require('../assets/picto-uber.png')}></Image>

          }         
          return (          
            <View style={{width: "60%", height: height / 7, flexDirection: "row", borderRadius: 5, alignItems: "center", justifyContent: "space-around", marginTop: 5, marginBottom: 5, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "gainsboro", shadowColor: "#000", shadowOffset: { width: 0, height: 2}, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5}} key={order.id}>
              {image}
              <Text style={[styles.orderNumbers, {paddingRight: 3}]}>{order.label_id}</Text></View>     
          )
        })}
        {/* {this.renderSwiper()} */}
      </View>
      )  
  }

  renderReadyOrdersV2 = () => {    
    let now = moment(this.state.now)

    // const ordersArray = this.toOrderedArray(this.props.orders)
    // let sortedArray = ordersArray.sort(function(a, b) {
    //     return a.endTime - b.endTime
    //    })
    // sortedArray = sortedArray.reverse()
    const sortedArray = this.props.ordersSalle
    // console.log("REAAADY", sortedArray)
    const removeOld = (order) => {
      const reference = moment(order.endTime)
      let period = now.diff(reference, "seconds")
      return period < 330    
    }

    let filteredArray = [...sortedArray]
        const filters = this.props.zone.filters
        // console.log("filters", filters)
        if (filters) {
            filteredArray = filteredArray.filter((order) => {
                // console.log("isTrue", (!filter.mode || filter.mode == "" || filter.mode == order.mode) && (!filter.origine || filter.origine == "" || filter.origine == order.origine)&& (!filter.status || filter.status == "" || filter.status == order.status))
                return filters.some((filter) => {
                    return (!filter.mode || filter.mode == "" || filter.mode == order.mode) && (!filter.origine || filter.origine == "" || filter.origine == order.origine)&& (!filter.status || filter.status == "" || filter.status == order.status)
                })                
            })
        }

    const recentFilteredArray = filteredArray.filter(removeOld)
   
    const text = recentFilteredArray.length < 2 ? "commande" : "commandes"
    const settings = this.props.user.settings || {}
    const mainColor = settings.mainColor || "#FED602"
    const secondColor = settings.secondColor  || "#231F20"
    const textColor = settings.subTextColor || "white"

      return(      
        <View style={{flex: 1, alignItems: "center"}}> 
        <View style={{width: "100%", height: height / 6.5, alignItems: "center", justifyContent: "center", backgroundColor: secondColor}}>
          <Text style={[{color: mainColor, fontWeight: 'bold', textAlign: "center", fontSize: height / 15}]}>C'EST PRÊT</Text>
          <Text style={{fontWeight: "bold", color: textColor}}>{recentFilteredArray.length} {text}</Text>
        </View>
          {/* <View style={{ borderBottomColor: 'white', marginBottom: height / 15, borderBottomWidth: 1, width: width / 2.5, marginTop: width / 50 }}/>    */}
  
          {recentFilteredArray.slice(0,5).map((order) => {
                {/* console.log("order", order) */}
                let image
              if (order.origine === "caisse") {
                image = <Image style={{height: height / 13, width: height / 13}} source={require('../assets/picto-caisse.png')}></Image>
    
              } else if (order.origine === "borne") {
                image = <Image style={{height: height / 11, width: undefined, aspectRatio: 52 / 95}} source={require('../assets/picto-borne.png')}></Image>
    
              } else if (order.origine === "UberEats") {
                image = <Image style={{height: height / 13, width: height / 13}} source={require('../assets/picto-uber.png')}></Image>

              } 
            
              return (          
                <View style={{width: "60%", borderRadius: 5, flexDirection: "row", backgroundColor: mainColor, height: height / 7, alignItems: "center", justifyContent: "space-around", marginTop: 5, marginBottom: 5, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "gainsboro", shadowColor: "#000", shadowOffset: { width: 0, height: 2}, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5}} key={order.id}>
                  {image}
                  <Text style={[styles.orderNumbers, {paddingRight: 3}]}>{order.label_id}</Text>
                </View>     
              )       
           
          })} 
          
        </View>
        ) 
    
     
  }

  // renderReadyOrdersV1 = () => {
  //   const ordersArray = this.toOrderedArray(this.props.orders)
  //   let sortedArray = ordersArray.sort(function(a, b) {
  //       return a.endTime - b.endTime
  //     })
  //   sortedArray = sortedArray.reverse()
  //   const order = sortedArray[0]
  //   const settings = this.props.user.settings || {}
  //   const mainColor = settings.mainColor || "#FED602"
  //   const secondColor = settings.secondColor || "#231F20"

  // }

  renderRightPartV1 = (adjust) => {
    const myHeight = height + adjust
    if (this.props.receivedOrder) {
      setTimeout(() => {          
        this.props.dispatch(removeReceived())
      }, 3000)
      // const ordersArray = this.toOrderedArray(this.props.orders)
      // let sortedArray = ordersArray.sort(function(a, b) {
      //     return a.endTime - b.endTime
      //   })
      // sortedArray = sortedArray.reverse()
      const sortedArray = this.props.ordersSalle
      const order = sortedArray[0]
      const settings = this.props.user.settings || {}
      const mainColor = settings.mainColor || "#FED602"
      const secondColor = settings.secondColor || "#231F20"
      let modeText
      if (order.mode == "surplace") {
        modeText = "SUR PLACE"
      } else if (order.mode == "emporter") {
        modeText = "À EMPORTER" 
      } else if (order.mode == "livraison") {
        modeText = "LIVRAISON"
      } else {
        modeText = ""
      } 
      return(
        <View style={{width: width - myHeight, backgroundColor: mainColor}}>
          <View style={{width: "100%", height: height / 6.5, alignItems: "center", justifyContent: "center", backgroundColor: secondColor}}>
            <Text style={[{color: mainColor, fontWeight: 'bold', textAlign: "center", fontSize: height / 15}]}>BON APPÉTIT</Text>          
          </View>
          <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
              <View style={{width: "45%", height: height / 2, backgroundColor: "white"}}>
                <View style={{width: "100%", height: height / 8, alignItems: "center", justifyContent: "center", backgroundColor: secondColor}}>
                  <Text style={[{color: "white", fontWeight: 'bold', textAlign: "center", fontSize: height / 15}]}>{order.label_id}</Text> 
                </View>
                <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
                    <Text style={{fontWeight: "bold", fontSize: height / 18, paddingBottom: height / 25}}>{modeText}</Text>
                    <Image style={{height: height / 10, width: height / 10}} source={require('../assets/picto-done.png')}></Image>
                    <Text style={{fontWeight: "bold", fontSize: height / 18, paddingTop: height / 25}}> C'EST PRÊT</Text>
                </View>
              </View>
          </View>
        </View>
        
      )
    } else {

      return(
        <View style={{width: width - myHeight, flexDirection: "row"}}>    
            {this.renderReadyOrdersV2()}        
        </View>
      )
    }
  }

  renderRightPart = (adjust) => {
    const myHeight = height + adjust
    if (this.props.receivedOrder) {
      setTimeout(() => {          
        this.props.dispatch(removeReceived())
      }, 3000)

       
      // const ordersArray = this.toOrderedArray(this.props.orders)
      // let sortedArray = ordersArray.sort(function(a, b) {
      //     return a.endTime - b.endTime
      //   })
      const sortedArray = this.props.ordersSalle
      const order = sortedArray[0]
      const settings = this.props.user.settings || {}
      const mainColor = settings.mainColor || "#FED602"
      const secondColor = settings.secondColor || "#231F20"

      let modeText
      if (order.mode == "surplace") {
        modeText = "SUR PLACE"
      } else if (order.mode == "emporter") {
        modeText = "À EMPORTER" 
      } else if (order.mode == "livraison") {
        modeText = "LIVRAISON"
      } else {
        modeText = ""
      }
      
      const fontSize = order.label_id.length > 3 ? height / 20 : height / 15
      return(
        <View style={{width: width - myHeight, backgroundColor: mainColor}}>
          <View style={{width: "100%", height: height / 6.5, alignItems: "center", justifyContent: "center", backgroundColor: secondColor}}>
            <Text style={[{color: mainColor, fontWeight: 'bold', textAlign: "center", fontSize: height / 15}]}>BON APPÉTIT</Text>          
          </View>
          <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
              <View style={{width: "45%", height: height / 2, backgroundColor: "white"}}>
                <View style={{width: "100%", height: height / 8, alignItems: "center", justifyContent: "center", backgroundColor: secondColor}}>
                  <Text style={[{color: "white", fontWeight: 'bold', textAlign: "center", fontSize: fontSize}]}>{order.label_id}</Text> 
                </View>
                <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
                    <Text style={{fontWeight: "bold", fontSize: height / 18, paddingBottom: height / 25}}>{modeText}</Text>
                    <Image style={{height: height / 10, width: height / 10}} source={require('../assets/picto-done.png')}></Image>
                    <Text style={{fontWeight: "bold", fontSize: height / 18, paddingTop: height / 25}}> C'EST PRÊT</Text>
                </View>
              </View>
          </View>
        </View>
        
      )
    } else {
      // const adjust= Platform.OS === "ios" ? 0 : StatusBar.currentHeight
      // const myHeight = width - (height - adjust)
      // console.log(StatusBar.currentHeight)
      return(
        <View style={{width: width - myHeight, flexDirection: "row"}}>
          <View style={{ flex: 1, backgroundColor: "white"}}>
            {this.renderCaredOrdersV2()}
          </View>
          <View style={{flex: 1, backgroundColor: "white"}}>
            {this.renderReadyOrdersV2()}
          </View>
        </View>
      )
    } 
    
  } 

  renderSalleV2 = () => {
      const adjust= Platform.OS === "ios" ? 0 : StatusBar.currentHeight
      const images = this.props.user.imagesV2
      const sliderViews = []
      this.props.user.imagesV2.forEach((url, i) => {
        const view =
        <View key={i}>
          <Image          
            style={{width: androidHeight - adjust, height: undefined, aspectRatio: 1 / 1}}      
            source={{
              uri: url,
            }}
          />
        </View>
        sliderViews.push(view)
      })
    
      return(
        <View style={{flex: 1, marginTop: adjust}}>
          <View style={{ flexDirection: "row"}}>
            <Swiper style={{height: androidHeight - adjust}} autoplay={true} autoplayTimeout={6} showsPagination={false}>
              {sliderViews}
            </Swiper>
            {/* <View style={{width: width - height, backgroundColor: "black", height: 100}}></View> */}
            {this.renderRightPart(adjust)}
            
            
              
        </View>
        {/* <Image style={styles.footer} source={require('../assets/footer.jpg')}></Image> */}
      </View>
      )
      
    
  }

  
  sendOrderV1 = () => {    
    if (this.state.orderNum) {      
      const now = new Date().getTime()
      const order = {}
      order.id = this.state.orderNum
      order.label_id = this.state.orderNum
      
      // console.log("send func", order)
      this.props.dispatch({type:'server/sendOrderV1', payload: order}) 
    //   this.socket.emit('sendOrderV1', {number: this.state.orderNum, timestamp: now})
      this.setState({orderNum: null})
    }
  }

  setOrderV2 = () => {  
    
        this.props.dispatch({type:'server/setOrderV2'})   
     
  }


  
  renderCuisineV1 = () => {
    const keyboard = Platform.OS === "ios" ? "name-phone-pad" : "default"
    const  buttonHeight = width / 10
    return(
      <View style={[styles.containerCuisine, {alignItems: "center"}]}>
        <Text style={[styles.textColor, styles.bigText, {marginRight: 15, marginLeft: 15}]}>SAISISSEZ LE NUMERO DE COMMANDE</Text>
        <View style={{ borderBottomColor: 'white', borderBottomWidth: 1, width: width / 2, marginTop: height / 50 }}/>

        <View style={[styles.formContainer, {marginTop: 20}]}>
            <TextInput
            
            style={styles.input}
            keyboardType={keyboard}
            onChangeText={text => {
              this.setState({orderNum: text}) 
            }}                             
            value={this.state.orderNum}/>
            <AwesomeButton backgroundColor="#76E79A" height={buttonHeight} width={buttonHeight} textSize={buttonHeight / 4.5} onPress={this.sendOrderV1}>Prête</AwesomeButton>                           
            
            </View>  
            {/* <Keyboard   
                   
              textInput={this.myTextInput}
              onInput={this.handleInput}
              inputType="textPassword"
              keyboardContainerStyle={{backgroundColor: "black", borderWidth: 0}}
              keyboardButtonPressStyle={{backgroundColor: "blue"}}
            />                                */}
      </View>
    )
  }

  refreshServer = () => {
    this.props.dispatch({type:'server/refresh'}) 
  }

  renderNavV1 = () => {
    if (this.props.zone.navV1 === true) {
      return(
         <View>
          <TouchableOpacity style={{paddingTop: 0, padding: 10}}  onPress={() => this.props.navigation.navigate("CallScreen")}><Text style={[styles.textColor, {fontSize: width / 70}]}>Ecran d'appel</Text></TouchableOpacity>
        </View>
      )
    }
  }

  renderCuisineV2 = () => {
    const zoneName = this.props.zone.libellé || this.props.zone.name
    return(
      <View style={[styles.containerCuisine, { paddingLeft: 15}]}>
        <View style={styles.header}>
        <View> 
          <TouchableOpacity style={{paddingTop: 0, padding: 10}} onPress={this.setOrderV2}><Text style={[styles.textColor, {fontSize: width / 70}]}>Envoyer</Text></TouchableOpacity>
          </View>
          <View style={{paddingRight: 10, paddingLeft: 10}}>
           <Text style={[styles.textColor, {textDecorationLine: 'underline', fontSize: width / 70}]}>Commandes en cours-{zoneName}</Text> 
          </View>      
          
          <View>
          <TouchableOpacity style={{paddingTop: 0, padding: 10}}  onPress={() => this.props.navigation.navigate("History")}><Text style={[styles.textColor, {fontSize: width / 70}]}>Commandes terminées</Text></TouchableOpacity>
          </View>
          <View>
            <TouchableOpacity  style={{paddingTop: 0, padding: 10}} onPress={this.refreshServer}><Text style={[styles.textColor, {fontSize: width / 70}]}>Effacer l'historique</Text></TouchableOpacity>
          </View>
          {this.renderNavV1()}
        </View>
        
        <OrderCard/>
      </View>
    )
  }

  renderZone = () => {
    const user = this.props.user
    
    const version = user.version
    // console.log("version", version)
    
    const zone = this.props.zone.name
    // console.log(zone)

    if (version === "V1" && zone === "salle") {
      return this.renderSalleV1()  
    } else if (version === "V1") { 
      return this.renderCuisineV1()
      
    } else if (version === "V2" && zone === "salle") {
      return this.renderSalleV2()
    } else if (version === "V2") {
      return this.renderCuisineV2()
    }     
  }

//   renderLogin = () => {
//       console.log("message", this.props.message)
//     return(
//       <View style={{alignItems: "center", marginTop: 10}}>
//         <TextInput
//           style={styles.inputLog}
//           value={this.state.name}
//           onChangeText={name => this.setState({ name })}
//           placeholder="Nom d'utilisateur"
//           autoCapitalize='none'
          
//         />
//         <TextInput
//           style={styles.inputLog}
//           value={this.state.password}
//           onChangeText={password => this.setState({ password })}
//           placeholder='Mot de passe'            
          
//         />
//         <AwesomeButton  style={{marginTop: 20}} onPress={this.handleLogin}>Connexion</AwesomeButton>  
//         <Text style={{marginTop: 20, color: "black"}}>{this.state.errorLog}</Text>
//       </View>
//     )
//   }

  
  render() {  
        // console.log("hi")
        return(
          <View style={{flex: 1}}>
            {this.renderZone()}
          </View>
        )      
      } 
  
}


function mapStateToProps(state) {
    return {
      user: state.user,      
      orders: state.orders,
      caredOrders: state.caredOrders,
      zone: state.zone,
      receivedOrder: state.receivedOrder,
      ordersSalle: state.ordersSalle,
      
    };
  }
  
  export default connect(mapStateToProps)(Home);
