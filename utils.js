const iso3166 = require('iso-3166-1');

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

exports.translateCountry = (answers) => {
  const countryAnswer = answers.find((a) => a?.question?.id === 1166850);
  if (!countryAnswer) return null;

  const isoCode = countryAnswer.response;

  try {
    const countryData = iso3166.whereAlpha2(isoCode);

    if (countryData) {
      return countryData.country;
    } else {
      throw new Error('Country not found');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
};
