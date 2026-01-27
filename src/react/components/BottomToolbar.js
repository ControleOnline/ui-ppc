import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

export default function BottomToolbar({ navigation }) {
  return (
    <View style={{ flexDirection: 'row', padding: 12, justifyContent: 'space-around' }}>
      <TouchableOpacity onPress={() => navigation.navigate('HomePage')}>
        <Text>Home</Text>
      </TouchableOpacity>

      {/* depois quando existir a rota */}
      {/* <TouchableOpacity onPress={() => navigation.navigate('Kitchen')}> */}
      {/*   <Text>Cozinha</Text> */}
      {/* </TouchableOpacity> */}
    </View>
  );
}
