import { AppRegistry } from 'react-native';
import App from './App';
import { createStackNavigator } from 'react-navigation'



AppRegistry.registerComponent('Sortable', () => createStackNavigator({ App }));
