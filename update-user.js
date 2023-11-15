const utils = require('./utils');
const member = require('./check-member-party');
const company = require('./check-user-company');

exports.updateUser = async (userId, user, titoEvent, eventId, cancel = false) => {
  if (cancel) {
    console.log(`cancel event ${eventId} in user ${userId}`);

    const newUserProperties = {
      properties: {
        email: user.email,
        firstname: user.first_name,
        lastname: user.last_name,
        company: user.company_name,
        elected_official_type_v2: user.responses['representative'] ? user.responses['representative'] : null,
        staff_or_volunteer_type_v2: user.responses['staff'] ? user.responses['staff'] : null,
      },
    };

    const updateUser = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${userId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.AUTH}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(newUserProperties),
    });
    const responseUpdate = await updateUser.json();

    try {
      const removeAssociation = await fetch(
        `https://api.hubapi.com/crm/v4/objects/contacts/${userId}/associations/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${process.env.AUTH}`,
          },
        }
      );
    } catch (e) {
      console.log(e);
    }
  } else {
    console.log(`update user ${userId} with event ${eventId}`);

    let associationTypeEvent = 167;
    let companyId = '';

    if (user.release.metadata) {
      associationTypeEvent = await utils.assocTypeId(user.release.metadata.association);
    }

    const checkMemberParty = await member.checkMemberParty(user);
    const responseMemberParty = checkMemberParty;

    console.log('[UPDATE_USER] Member party id: ', responseMemberParty);

    if (user.responses['what-is-your-country']) {
      console.log('tiene country, value: ', user.responses['what-is-your-country']);
    }

    // get company from field value in hubspot
    if (user.responses['organisation']) {
      const checkCompany = await company.checkUserCompany(user);
      companyId = checkCompany;
    }

    // Test
    let representativeValues = '';
    if (user.responses['representative']) {
      const rawValues = user.responses['representative'];
      const elements = rawValues.split(', ');
      const filteredElements = elements.filter((element) => element.trim() !== '');
      const formattedString = filteredElements.join(';');
      representativeValues = formattedString;
    }

    let staffValues = '';
    if (user.responses['staff']) {
      const rawValues = user.responses['staff'];
      const elements = rawValues.split(', ');
      const filteredElements = elements.filter((element) => element.trim() !== '');
      const formattedString = filteredElements.join(';');
      staffValues = formattedString;
    }

    console.log('[UPDATE_USER] Representative formatted value: ', representativeValues);
    console.log('[UPDATE_USER] Staff formatted value: ', staffValues);

    const newUserProperties = {
      properties: {
        email: user.email,
        firstname: user.first_name,
        lastname: user.last_name,
        company: user.company_name,
        elected_official_type_v2: user.responses['representative'] ? representativeValues : null,
        staff_or_volunteer_type_v2: user.responses['staff'] ? staffValues : null,
        country_multioption: user.responses['what-is-your-country'] ? user.responses['what-is-your-country'] : null,
      },
    };

    console.log('Properties: ', JSON.stringify(newUserProperties));

    try {
      const updateUser = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${userId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.AUTH}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(newUserProperties),
      });
      const responseUpdate = await updateUser.json();

      const bodyAssociationEvent = {
        inputs: [
          {
            from: {
              id: userId,
            },
            to: {
              id: eventId,
            },
            type: associationTypeEvent,
          },
        ],
      };

      const createAssociation = await fetch(`https://api.hubapi.com/crm/v3/associations/contacts/events/batch/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AUTH}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(bodyAssociationEvent),
      });

      const responseAssociation = await createAssociation.json();
      if (responseAssociation.status !== 'COMPLETE') {
        throw new Error('failed association contact to event');
      }

      // add member party association
      if (responseMemberParty) {
        console.log('[CREATE_USER] Member party value: ', responseMemberParty);
        const createMemberPartyAssoc = await fetch(
          'https://api.hubapi.com/crm/v3/associations/contacts/2-117824001/batch/create',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.AUTH}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              inputs: [
                {
                  from: {
                    id: userId,
                  },
                  to: {
                    id: responseMemberParty,
                  },
                  type: user.responses['role'] ? getRoleMapping(user.responses['role']) : 129,
                },
              ],
            }),
          }
        );

        const responseCreateComAss = await createMemberPartyAssoc.json();
        if (responseAssociation.status !== 'COMPLETE') {
          throw new Error('failed associtaiton contact to company');
        }
      }

      if (companyId) {
        const createCompanyAssoc = await fetch(
          'https://api.hubapi.com/crm/v3/associations/contacts/company/batch/create',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.AUTH}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              inputs: [
                {
                  from: {
                    id: userId,
                  },
                  to: {
                    id: companyId,
                  },
                  type: 1,
                },
              ],
            }),
          }
        );

        const responseCreateComAss = await createCompanyAssoc.json();
        if (responseAssociation.status !== 'COMPLETE') {
          throw new Error('failed associtaiton contact to company');
        }
      }
    } catch (e) {
      console.log(e);
    }

    // update legals
    const legalEventsBody = {
      emailAddress: user.email,
      subscriptionId: 239874603,
      legalBasis: 'CONSENT_WITH_NOTICE',
      legalBasisExplanation: `People opted in through event forms for the ${titoEvent.title}`,
    };

    const legalMktBody = {
      emailAddress: user.email,
      subscriptionId: 153977537,
      legalBasis: 'CONSENT_WITH_NOTICE',
      legalBasisExplanation: `People opted in through event forms for the ${titoEvent.title}`,
    };

    try {
      const updateLegalsEvent = await fetch('https://api.hubapi.com/communication-preferences/v3/subscribe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AUTH}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(legalEventsBody),
      });
      const responseUpdateLegals = await updateLegalsEvent.json();

      if (user.opt_ins.length > 0) {
        const otpMarkeing = user.opt_ins.filter((item) => item.id == '490')[0];
        console.log('[MARKETING] Is subscribed? ', JSON.stringify(otpMarkeing));

        if (otpMarkeing && otpMarkeing.opted_in === true) {
          const updateLegalsMkt = await fetch('https://api.hubapi.com/communication-preferences/v3/subscribe', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.AUTH}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(legalMktBody),
          });
          const responseUpdateLegalsMkt = await updateLegalsMkt.json();
        }
      }
    } catch (e) {
      console.log(e);
    }
  }
  //  const updateUser = await fetch('/crm/v3/objects/contacts/', {

  //  })
  console.log(`${userId} update`);
  return userId;
};

// Utils
function getRoleMapping(roleRaw) {
  const role = roleRaw.trim();
  switch (role) {
    case 'Chair':
      return 115;
    case 'Secretary General':
      return 117;
    case 'Elected Official':
      return 119;
    case 'International Secretary':
      return 121;
    case 'Delegate':
      return 123;
    case 'Treasurer':
      return 125;
    case 'Staff or volunteer':
      return 127;
    default:
      return 129;
  }
}
