const fs = require('fs').promises;

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

exports.translateCountry = async (answers) => {
  const countryAnswer = answers.find((a) => a?.question?.title === 'What is your country?');
  if (!countryAnswer) return null;

  const isoCode = countryAnswer.response;
  if (!isoCode) return null;

  try {
    const countriesJson = await fs.readFile('countries.json', 'utf-8');
    const countriesData = JSON.parse(countriesJson);
    const findCountry = countriesData.find((c) => c.cca2 === isoCode);

    if (findCountry) {
      console.log('Country FOUND: ', findCountry.name?.common);
      return findCountry?.name?.common;
    } else {
      throw new Error('Country name not found');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
};
