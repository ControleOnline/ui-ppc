import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { inlineStyle_6_10 } from './PPCToolbar.styles';

export default function PPCToolbar({ navigation }) {
  return (
    <View style={inlineStyle_6_10}>
      <TouchableOpacity onPress={() => navigation.navigate('HomePage')}>
        <Text>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('ProfilePage')}>
        <Text>Profile</Text>
      </TouchableOpacity>
      {/* depois quando existir a rota */}
      {/* <TouchableOpacity onPress={() => navigation.navigate('Kitchen')}> */}
      {/*   <Text>Cozinha</Text> */}
      {/* </TouchableOpacity> */}
    </View>
  );
}
