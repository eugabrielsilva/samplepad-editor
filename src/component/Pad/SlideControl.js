/* Global imports */
import React from 'react';
import Slider from 'rc-slider';

/* Component imports */
import 'css/Pad/Control.scss'

class SlideComponent extends React.Component {

  /*
   * @constructor
   * @param {Object} props
   */
  constructor(props) {
    super(props)

    this.state = {
      value: String(props.value),
      editing: false
    };
  }

  componentDidUpdate(prevProps) {
    if (!this.state.editing && this.props.value !== prevProps.value) {
      this.setState({value: String(this.props.value)});
    }
  }

  onSliderChange(value) {
    this.setState({value: String(value)});
  }

  commitValue() {
    const parsedValue = Number.parseInt(this.state.value, 10);
    const value = Number.isFinite(parsedValue)
      ? Math.min(this.props.max, Math.max(this.props.min, parsedValue))
      : this.props.value;

    this.setState({
      value: String(value),
      editing: false
    });
    this.props.onChange(value);
  }

  getWidth(value) {
    const range = this.props.max - this.props.min;
    const step = 1.2 / range;

    return (value * step) + 'em';
  }

  getColor(value) {
    const range = this.props.max - this.props.min;
    const step = 255 / range;
    const color = Math.floor(255 - (value * step)).toString(16);
    return '#' + color + color + color;
  }

  getHandle(handleProps) {
    const {value, ...restProps} = handleProps;
    const displayValue = restProps.dragging ? value : this.props.value;
    const style = {};

    // if (this.props.overlayProperty === 'width') {
    //   style.width = this.getWidth(displayValue);
    // }
    // if (this.props.overlayProperty === 'color') {
    //   style.color = this.getColor(displayValue);
    // }

    return (
      <div className="overlapHandle">
        <i
          className={"glyphicon glyphicon-" + this.props.icon + " overlapValue"}
          style={style}
          aria-hidden="true" />
      </div>
    );
  }

  render() {
    return (
      <span className="controlContainer has-tooltip-bottom" data-tooltip={this.props.tooltip + this.props.value} >
        <span className="controlIcon">
          <span className="overlapContainer">
            <Slider
              min={this.props.min}
              max={this.props.max}
              value={this.props.value}
              vertical={true}
              handleRender={(node, handleProps) => this.getHandle(handleProps)}
              onChange={(value) => this.onSliderChange(value)}
              onAfterChange={(value) => this.props.onChange(value)} />
          </span>
          <i className={"glyphicon glyphicon-" + this.props.icon + " has-text-grey-lighter"} aria-hidden="true" />
        </span>
        <input
          aria-label={this.props.tooltip.trim()}
          className="input is-small controlValue"
          type="number"
          min={this.props.min}
          max={this.props.max}
          step={1}
          value={this.state.value}
          onFocus={() => this.setState({editing: true})}
          onChange={(event) => this.setState({value: event.target.value})}
          onBlur={() => this.commitValue()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.target.blur();
          }} />
      </span>
    );
  }
}

export default SlideComponent;
