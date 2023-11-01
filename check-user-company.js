exports.checkUserCompany = async (user) => {
  let idCompany = '';
  const companyName = user.responses['organisation'];

  try {
    const searchCompany = await fetch('https://api.hubspot.com/crm/v3/objects/company/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AUTH}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'name',
                operator: 'EQ',
                value: companyName,
              },
            ],
          },
        ],
      }),
    });

    const resultSearchCompany = await searchCompany.json();

    if (resultSearchCompany.results.length > 0) {
      idCompany = resultSearchCompany.results[0].id;
    } else {
      // create commpany if not exist
      const createCompany = await fetch('https://api.hubapi.com/crm/v3/objects/companies', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AUTH}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            name: companyName,
          },
        }),
      });

      const responseCreateCompany = await createCompany.json();
      idCompany = responseCreateCompany.id;
    }
  } catch (e) {
    console.log(e);
  }
  return idCompany;
};
