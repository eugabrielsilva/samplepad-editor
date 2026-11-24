/* Global imports */
import React from 'react';
import { connect } from 'react-redux'

/* App imports */
import { DeviceType } from 'const'
import { selectAndLoadDrive } from 'actions/drive'
import { isCapacitor } from 'platform/runtime'

/* Component imports */
import KitListComponent from 'component/KitList'
import CapacitorControls from 'component/CapacitorControls'

const HeaderComponent = (props) => {
  return (
    <section className="hero is-small is-primary is-bold">
      <div className="hero-body">
        <div className="container">
          <div className="level">
            <div className="level-left">
              <div className="level-item">
                <h1 className="title">
                  SamplePad Kit Editor
                  <div className="is-size-7">Model: { props.deviceType }</div>
                </h1>
              </div>
            </div>

            <div className="level-right">
              <div className="level-item">
                {isCapacitor && <CapacitorControls loadCard={props.loadCard} />}
                {!isCapacitor && <KitListComponent />}
              </div>
            </div>
          </div>
          {isCapacitor &&
            <div className="capacitor-kit-list">
              <KitListComponent />
            </div>
          }
        </div>
      </div>
    </section>
  );
}

const mapStateToProps = (state, ownProps) => {
  let deviceType = "";
  switch (state.drive.deviceType) {
    case DeviceType.SAMPLEPAD_PRO:
      deviceType = "SAMPLEPAD PRO";
      break;
    case DeviceType.SAMPLERACK:
      deviceType = "SAMPLERACK";
      break;
    default:
      deviceType = "";
      break;
  }

  return {
    deviceType: deviceType
  }
}

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    loadCard: () => {
      dispatch(selectAndLoadDrive())
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(HeaderComponent)
