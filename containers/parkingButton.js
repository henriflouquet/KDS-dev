import Expo from 'expo';
import React, {Component} from 'react'
import { Text, ScrollView, Dimensions, SafeAreaView, TouchableNativeFeedback, Image, View, TextInput, FlatList,  Platform } from 'react-native'
import styles from "../styles"
import { connect } from 'react-redux'
import moment from 'moment'
import Modal from "react-native-modal"
const {width, height}= Dimensions.get('window')
import { TouchableOpacity } from 'react-native-gesture-handler'

class ParkingButton extends Component {  
    render() {
        
        // let count = Object.keys(this.props.orders).length - sliceIndex
        // count = count > 0 ? count : 0
        const image = this.state.isOpenedLeft ?  <Image style={{height: height / 13, width: height / 13}} source={require('../assets/parking-noir.png')}></Image> 
        :
        <Image style={{height: height / 13, width: height / 13}} source={require('../assets/parking-blanc.png')}></Image>
        return(
            <TouchableOpacity style={{flexDirection: "row"}} onPress={() => this.setState({isOpenedLeft: !this.state.isOpenedLeft})}>
                {image}  
                <Text style={styles.textColor}>{count}</Text>             
            </TouchableOpacity>            
        )
        
    }
}

function mapStateToProps(state) {
    return {
      orders: state.orders,
      zone: state.zone,
      ip: state.ip,
      timeStatus: state.timeStatus
    };
  }
  
  export default connect(mapStateToProps)(ParkingButton);