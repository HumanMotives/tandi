// Simplified AI (No Vent Version)

export function createAI() {

  const enemies = {
    warden: {
      route: ['A','D','OFFICE_LEFT'],
      idx: 0,
      timer: 0
    },
    glint: {
      route: ['B','D','OFFICE_RIGHT'],
      idx: 0,
      timer: 0
    }
  };

  function reset(){
    enemies.warden.idx = 0;
    enemies.glint.idx = 0;
  }

  function update(state, dt){
    for(const key of ['warden','glint']){
      const e = enemies[key];
      e.timer += dt;
      if(e.timer > 4000 && e.idx < e.route.length - 1){
        e.idx++;
        e.timer = 0;
      }
    }

    // Threat activation
    state.office.threats.left.active =
      enemies.warden.route[enemies.warden.idx] === 'OFFICE_LEFT';

    state.office.threats.right.active =
      enemies.glint.route[enemies.glint.idx] === 'OFFICE_RIGHT';
  }

  function checkLoss(state){
    if(state.office.threats.left.active && !state.office.leftDoorClosed){
      return true;
    }
    if(state.office.threats.right.active && !state.office.rightDoorClosed){
      return true;
    }
    return false;
  }

  function getEntitiesOnCam(state, camId){
    const result = [];

    if(enemies.warden.route[enemies.warden.idx] === camId){
      result.push({ kind:'warden', x:40, y:60 });
    }

    if(enemies.glint.route[enemies.glint.idx] === camId){
      result.push({ kind:'glint', x:55, y:65 });
    }

    return result;
  }

  function getOfficeThreatKinds(state){
    return {
      left: state.office.threats.left.active ? 'warden' : null,
      right: state.office.threats.right.active ? 'glint' : null
    };
  }

  return {
    reset,
    update,
    checkLoss,
    getEntitiesOnCam,
    getOfficeThreatKinds
  };
}
