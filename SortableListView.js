import React, { Component } from 'react'
import { Animated, ListView, View, TouchableOpacity, PanResponder } from 'react-native'

class SortableListView extends Component {
  _hoverAnim = new Animated.Value(0)
  constructor(props) {
    super(props)
    const dataSource = new ListView.DataSource({
      rowHasChanged: (r1, r2) => r1 !== r2,
    }).cloneWithRows(props.data.map(d => ({ item: d, selected: false })))

    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => {
        console.log('pand!')
        return true;
      },
      onMoveShouldSetPanResponder: () => {
        console.log('move!')
        return !!this.state.HoverComponent;
      },
      onPanResponderMove: (evt, gestureState) => {
        this._hoverAnim.setValue(gestureState.moveY)
      },
      onPanResponderRelease: () => {
        this._hoverAnim.setValue(0)
        this.setState(state => ({
          HoverComponent: null,
          dataSource: state.dataSource.cloneWithRows(this.props.data.map(d => ({ item: d, selected: false}))),
        }))
      }
    })

    this.state = {
      dataSource,
    }
  }

  onData = () => {
    console.log('NEW DATA')
  }

  rowHasChanged = (...p) => {
    console.log('ROW CANGE?', p)
    return true
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.data !== nextProps.data) {
      this.setState(state => ({ dataSource: state.dataSource.cloneWithRows(nextProps.data)  }))
    }
  }

  _rowClones = []

  renderRow = (rowData, sectionId, rowId, highlightRow) => {
    const { item, selected } = rowData
    console.log('RWO DATA', rowData, rowId)
    const component = <TouchableOpacity
      onLongPress={() => {
        console.log('LONG PRESS', rowId)
        this.setState(state => ({ 
          HoverComponent: this._rowClones[rowId],
          dataSource: state.dataSource.cloneWithRows(this.props.data.map((d, i) => ({ item: d, selected: rowId === i }))),
        }))
      }}

      style={{
        height: 30,
        width: 200,
        opacity: selected ? 0.5 : 1,
        backgroundColor: `rgb(${item}, ${item}, ${item})`
      }} />

    this._rowClones[rowId] = React.cloneElement(component)
    
    return component
    
  }

  renderHoverComponent = (HoverComponent) => {
    return (
      <Animated.View 
        style={{
          position: 'absolute',
          top: this._hoverAnim
        }}
      >
        {HoverComponent}
      </Animated.View>
    )
  }

  render() {
    const { HoverComponent } = this.state
    return (
      <View
      {...this._panResponder.panHandlers}
      style={{ backgroundColor: '#fafafa', flex: 1}}
      >
      <ListView 
        dataSource={this.state.dataSource}
        renderRow={this.renderRow}
      />
      {!!HoverComponent && this.renderHoverComponent(HoverComponent)}
      </View>
    )
  }
}

export default SortableListView