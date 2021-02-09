import React, {Component} from 'react'
import { Text, View, TouchableOpacity, Image, SafeAreaView, TextInput, Platform, StatusBar, StyleSheet, Dimensions } from 'react-native'
import { connect } from 'react-redux'
import styles from "../styles"
import AwesomeButton from "react-native-really-awesome-button"

import moment from 'moment'

const {width, height}= Dimensions.get('window')


class CallScreen extends Component { 
    state = {       
        orderNum: null,
      }

    sendOrderAlt = () => {    
        if (this.state.orderNum) {      
          
          const order = {}
          order.id = this.state.orderNum
          order.label_id = this.state.orderNum
          
          // console.log("send func", order)
          this.props.dispatch({type:'server/sendOrderAlt', payload: order}) 
        //   this.socket.emit('sendOrderV1', {number: this.state.orderNum, timestamp: now})
          this.setState({orderNum: null})
        }
      }

   render() {
        const keyboard = Platform.OS === "ios" ? "name-phone-pad" : "default"
        const  buttonHeight = width / 10
        return(
            <View style={[styles.containerCuisine, {alignItems: "center"}]}>
            <TouchableOpacity style={{paddingTop: 0, paddingBottom: height / 10}}  onPress={() => this.props.navigation.navigate("Home")}><Text style={[styles.textColor, {fontSize: width / 45} ]}>Commandes en cours</Text></TouchableOpacity>

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
                    <AwesomeButton backgroundColor="#76E79A" height={buttonHeight} width={buttonHeight} textSize={buttonHeight / 4.5} onPress={this.sendOrderAlt}>Prête</AwesomeButton>                           
                    
                    </View>  
                    
            </View>
        )
   }
    
}

function mapStateToProps(state) {
    return {
      finishedOrders: state.finishedOrders, 
      orders: state.orders,     
    }
  }
  
  export default connect(mapStateToProps)(CallScreen);