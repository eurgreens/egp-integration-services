exports.assocTypeId = async (id) => {
  const name = id.toLowerCase().trim();
  switch (name) {
    case 'volunteer':
      return 135;
    case 'speaker':
      return 78;
    case 'press':
      return 131;
    case 'staff':
      return 133;
    case 'special invitee':
      return 165;
    default:
      return 167;
  }
};
