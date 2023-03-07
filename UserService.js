// helpers
import { httpServerAgent } from "@Helpers/HttpAgent/HttpAgentServer";

// constants
import apiEndpointsClient from "@Constants/apiEndpointsClient";
import apiEndpointsServer from "@Constants/apiEndpointsServer";
import apiOperations from "@Constants/apiOperations";
import httpClientAgent from "@Helpers/HttpAgent/HttpAgentClient";

export default class UserServerService {
    static async getOtpCode(phone) {
        try {
            const body = {
                operation: apiOperations.login.getOtp,
                params: {
                    phone
                }
            };
            const { data } = await httpServerAgent.post(apiEndpointsServer.clients, body);
            return data;
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on getOtpCode:", error);
            console.log("===================================================");
            throw error;
        }
    }

    static async login(phone, otp, rememberMe) {
        try {
            const body = {
                operation: apiOperations.login.getToken,
                params: {
                    phone,
                    otp
                }
            };
            const { data } = await httpServerAgent.post(apiEndpointsServer.clients, body);
            if (data.res === "error") {
                throw new Error(data.error);
            }
            return data;
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on login:", error);
            console.log("===================================================");
            throw error;
        }
    }

    static async registerNewUser(userData) {
        try {
            const { token, lastName, firstName, middleName, email, gender, birthDate } = userData;

            const body = {
                operation: "register",
                params: {
                    token: token,
                    l: lastName,
                    m: middleName ? middleName : " ",
                    f: firstName ? firstName : " ",
                    e: email,
                    g: gender,
                    bd: birthDate,
                    la: "Y"
                }
            };
            const { data } = await httpServerAgent.post(apiEndpointsServer.clients, body);
            return data;
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on registerNewUser:", error);
            console.log("===================================================");
            throw error;
        }
    }

    static async getUserData(token, phone, ordersDetails = 1, servicesDetails = 1) {
        try {
            const body = {
                operation: apiOperations.login.info,
                params: {
                    phone,
                    token,
                    orders: ordersDetails,
                    services: servicesDetails
                }
            };
            const { data } = await httpServerAgent.post(apiEndpointsServer.clients, body);
            return data;
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on getUserData:", error);
            console.log("===================================================");
            throw error;
        }
    }

    static async getCurrentUser(userInfo, token) {

        const { default_person, persons, account } = userInfo;
        const date = new Date(account.birthDate);

        if(account.registered === true)
        {
            if(!default_person || default_person.length == 0)
            {
                if(persons.length > 0)
                {
                    return  persons[0]
                }else {

                    const newUserData = {
                        lastName: account.lastName,
                        firstName: account.firstName,
                        middleName: account.middleName,
                        birthDate: `${(date.getDate() > 9) ? date.getDate() : `0${date.getDate()}`}-${(date.getMonth()+1 > 9) ? date.getMonth()+1 : `0${date.getMonth()+1}`}-${date.getFullYear()}`,
                        gender: account.gender,
                        email: account.email,
                        location: {id: "611b76e43254b616974142d0"}
                    }

                    const data = await this.createRelatedPerson(newUserData, token)
                    const setDefault = await this.switchCurrentUser({personId: data.profile.ProfileId}, token)
                    return setDefault.client.defaultPerson
                }
            }else{
                return default_person;
            }
        }
    }

    static async createRelatedPerson(newUserData, token) {
        try {
            const { lastName, firstName, middleName, birthDate, email, gender, location, profileId } = newUserData;

            const body = {
                operation: apiOperations.login.updateProfile,
                params: {
                    token,
                    profile: {
                        id: "",
                        ProfileId: "",
                        LastName: lastName,
                        FirstName: firstName ? firstName : " ",
                        MiddleName: middleName ? middleName : " ",
                        BirthDate: birthDate,
                        Gender: gender,
                        Email: email,
                        DefaultLocation: location.id
                    }
                }
            };

            const { data } = await httpServerAgent.post(apiEndpointsServer.clients, body);
            return data;
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on createRelatedPerson:", error);
            console.log("===================================================");
            throw error;
        }
    }

    static async mergePerson(token, mainProfileId, mergeProfileList) {
        try {
            const body = {
                operation: apiOperations.login.mergeProfiles,
                params: {
                    token,
                    main: mainProfileId,
                    merged: mergeProfileList
                }
            };

            const { data } = await httpServerAgent.post(apiEndpointsServer.clients, body);
            return data;
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on updateRelatedUser:", error);
            console.log("===================================================");
            throw error;
        }
    }

    static async updateRelatedUser(userData, token) {
        try {
            const { lastName, firstName, middleName, birthDate, email, gender, location, profileId } = userData;

            const body = {
                operation: apiOperations.login.updateProfile,
                params: {
                    token,
                    profile: {
                        id: profileId ? profileId : "",
                        ProfileId: profileId ? profileId : "",
                        LastName: lastName,
                        FirstName: firstName ? firstName : " ",
                        MiddleName: middleName ? middleName : " ",
                        BirthDate: birthDate,
                        Gender: gender,
                        Email: email,
                        DefaultLocation: location.id
                    }
                }
            };

            const { data } = await httpServerAgent.post(apiEndpointsServer.clients, body);
            return data;
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on updateRelatedUser:", error);
            console.log("===================================================");
            throw error;
        }
    }

    static async archivePerson(token, personId, mode) {
        try {
            const body = {
                operation: apiOperations.login.archive,
                params: {
                    person: personId,
                    token,
                    mode
                }
            };
            const { data } = await httpServerAgent.post(apiEndpointsServer.clients, body);
            return data;
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on archivatePerson:", error);
            console.log("===================================================");
            throw error;
        }
    }

    static async getPersonOrders(token, phone, profileId) {
        try {
            const userData = await UserServerService.getUserData(token, phone, 1, 0);
            if (!userData?.persons) {
                return [];
            }

            const personOrders = userData.persons.find(person => person.ProfileId === profileId);

            return personOrders?.Orders || [];
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on getUserData:", error);
            console.log("===================================================");
            throw error;
        }
    }

    static async switchCurrentUser(personData, token) {
        try {
            const {personId} = personData

            const body = {
                operation: apiOperations.login.setDefaultProfile,
                params: {
                    token: token,
                    person: personId,
                }
            };
            const { data } = await httpServerAgent.post(apiEndpointsServer.clients, body);
            return data;
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on getUserData:", error);
            console.log("===================================================");
            throw error;
        }
    }

    static async logout() {
        const url = apiEndpointsClient.logout;
        try {
            return await httpClientAgent.post(url);
        } catch (error) {
            throw error;
        }
    }

    /**
     *
     * @param {string} phone
     * @param {string} token
     * @return {Promise<any>}
     */
    static async deleteClient(token) {
        try {
            const body = {
                operation: apiOperations.login.deleteProfile,
                params: {
                    token
                }
            };
            const { data } = await httpServerAgent.post(apiEndpointsServer.clients, body);
            return data;
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on deleteClient:", error);
            console.log("===================================================");
            throw error;
        }
    }

    static async getPDF(orderId, token) {
        try {
            const postData = {
                token,
                operation: "result",
                order: {
                    id: orderId
                }
            };
            const { data } = await httpServerAgent.post(apiEndpointsServer.downloadResult, postData);
            return data;
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on getPDF /order:", error);
            console.log("===================================================");
            throw error;
        }
    }

    static async sendMail(email, orderId, token) {
        try {
            const postData = {
                token,
                operation: "email_res",
                options: { email: email },
                order: {
                    id: orderId
                }
            };

            const { data } = await httpServerAgent.post(`${apiEndpointsServer.downloadResult}`, { ...postData });

            return data;
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on sendMail /email_res:", error);
            console.log("===================================================");
            throw error;
        }
    }

    static async emailInvoice(orderId, departmentUrl, token) {
        try {
            const postData = {
                token,
                operation: "email_invoice",
                order: {
                    id: orderId,
                    centersUrl: departmentUrl
                }
            };

            const { data } = await httpServerAgent.post(`${apiEndpointsServer.downloadResult}`, { ...postData });
            return data;
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on emailInvoice /email_invoice:", error);
            console.log("===================================================");
            throw error;
        }
    }

    /**
     *
     * @param {import('@Services/client/UserService').UpdateAccountData} updateData
     * @return {Promise<*>}
     */
    static async updateAccount(updateData) {
        try {
            return (await httpServerAgent.post(apiEndpointsServer.updateAccount, { ...updateData })).data;
        } catch (error) {
            console.log("===================================================");
            console.log("Error occurred on updateAccount:", error);
            console.log("===================================================");
            throw error;
        }
    }
}
