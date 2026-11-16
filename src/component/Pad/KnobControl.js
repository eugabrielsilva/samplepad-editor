/* Global imports */
import React from 'react';
import Slider from 'rc-slider';

/* Component imports */
import 'css/Pad/Control.scss'

class KnobComponent extends React.Component {

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

  getRotateTransform(value) {
    const range = this.props.max - this.props.min;
    const step = 180 / range;
    const rotation = -90 + (step * (value - this.props.min));
    return 'rotate(' + rotation + 'deg)';
  }

  getHandle(handleProps) {
    const {value, ...restProps} = handleProps;
    const displayValue = restProps.dragging ? value : this.props.value;

    return (
      <span className="knobIcon">
        <i
          style={{transform: this.getRotateTransform(displayValue)}}
          className={"glyphicon glyphicon-" + this.props.icon}
          aria-hidden="true" />
      </span>
    );
  }

  render() {
    return (
      <span className="controlContainer has-tooltip-bottom"
        data-tooltip={this.props.tooltip + this.props.value} >
        <span className="controlIcon">
          <span className="knobSlider">
            <Slider
              min={this.props.min}
              max={this.props.max}
              value={this.props.value}
              vertical={true}
              handleRender={(node, handleProps) => this.getHandle(handleProps)}
              onChange={(value) => this.onSliderChange(value)}
              onAfterChange={(value) => this.props.onChange(value)} />
          </span>
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

export default KnobComponent;
