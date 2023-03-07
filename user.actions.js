import { getSession, signIn, signOut } from "next-auth/client";

// services
import UserService from "@Services/client/UserService";
import LocationsService from "@Services/client/LocationsService";

// constants
import loginFormStages from "@Constants/loginForm";
import profileView from "@Constants/profileViews";
import loginResults from "@Constants/loginResults";
import { userActionTypes, profileViews, accountActionTypes, modalActionTypes } from "../types";

// actions
import { userProfileView } from "./profileView.actions";
import { basketActions } from "./basket.actions";
import { locationActions } from "./location.actions";
import { phoneActions } from "./phone.actions";
import { loyaltyActions } from "./loyalty.actions";
import { modalActions } from "@Store/actions/modal.actions";
import {accountActions} from "@Store/actions/account.actions";

export const userActions = {
    getOtpCode,
    login,
    getUserData,
    changeUser,
    getRelatedPersons,
    createRelatedPerson,
    updateCurrentUser,
    logout,
    restoreUserPerson,
    updatePerson,
    clearUserArchive,
    deleteUserPerson,
    archivedPerson,
    setMainPerson,
    deleteClient,
    mergeProfiles,
    getCurrentUser
};

function getOtpCode(phone) {
    return async dispatch => {
        try {
            dispatch(request(phone));
            await UserService.getOtpCode(phone);
            dispatch(success());
        } catch (error) {
            dispatch(failure(error));
            console.error("========================================");
            console.error("getOtpCode action failed ", error);
            console.error("========================================");
        }
    };

    function request(phone) {
        return { type: userActionTypes.GET_OTP_REQUESTS, phone };
    }
    function success() {
        return { type: userActionTypes.GET_OTP_SUCCESS, stage: loginFormStages.otp };
    }
    function failure(error) {
        return { type: userActionTypes.GET_OTP_FAILURE, error };
    }
}

function login(phone, otp, rememberMe, fetchBasket = true) {
    return async dispatch => {
        try {
            dispatch(request(otp));
            const signInResponse = await signIn("credentials", { phone, otp, redirect: false });
            if (!signInResponse.error && signInResponse.ok) {
                const session = await getSession();
                if (session && session.accessToken) {
                    dispatch(success(session.accessToken));
                    dispatch(phoneActions.addMainPhone(phone));
                    dispatch(getUserData());
                    dispatch(basketActions.fetchBasket());
                } else {
                    dispatch(failure());
                }
            } else {
                dispatch(failure());
            }
        } catch (error) {
            dispatch(failure(error));
            console.error("========================================");
            console.error("login action failed ", error);
            console.error("========================================");
        }
    };

    function request(otp) {
        return { type: userActionTypes.LOGIN_REQUESTS, otp };
    }
    function success(jwt) {
        return { type: userActionTypes.LOGIN_SUCCESS, jwt };
    }
    function setLoginStage(stage) {
        return { type: userActionTypes.SET_LOGIN_STAGE, stage };
    }
    function failure(error = "") {
        return { type: userActionTypes.LOGIN_FAILURE, error };
    }
}

function getUserData(skipSetStage = false) {
    return async (dispatch, getState) => {
        dispatch(request());
        const currentLocation = getState().location;
        try {
            const userData = await UserService.getUserData();

            const { currentUser, persons, loyalty, account } = userData;

            if (currentUser?.defaultLocationId && !currentLocation) {
                const defaultLocation = LocationsService.getLocationFromStorageById(currentUser?.defaultLocationId);
                if (defaultLocation) {
                    dispatch(locationActions.setLocation(defaultLocation));
                }
            } else if (currentLocation) {
                const result = await LocationsService.setLocationToPerson(currentUser.profileId, currentLocation.id);
                currentUser.defaultLocationId = currentLocation.id;
            }

            if (persons) {
                dispatch(setRelatedPersons(persons));
            }

            if (loyalty) {
                dispatch(loyaltyActions.setUsersLoyalty(loyalty));
            }

            if (account) {
                dispatch(setAccountData(account));
            }
            !skipSetStage && dispatch(success(currentUser, !account.loyaltyAgree ? loginFormStages.loyalty : loginFormStages.login));
        } catch (error) {
            dispatch(failure(error));
        }
    };

    function request() {
        return { type: userActionTypes.GET_USER_DATA_REQUESTS };
    }

    function success(currentUser, stage = loginFormStages.login) {
        return { type: userActionTypes.GET_USER_DATA_SUCCESS, currentUser, stage };
    }

    function failure(error) {
        return { type: userActionTypes.GET_USER_DATA_FAILURE, error };
    }

    function setRelatedPersons(relatedUsers) {
        return { type: userActionTypes.GET_RELATED_SUCCESS, relatedUsers };
    }

    function setUsersLoyalty(loyalty) {
        // return { type: userActionTypes.GET_RELATED_SUCCESS, relatedUsers }
    }
    function setAccountData(account) {
        return { type: accountActionTypes.SET_ACCOUNT_DATA, payload: account };
    }
}

function changeUser(selectedUser) {
    return dispatch => {
        dispatch(request());
        UserService.changeUser(selectedUser).then(
            () => {

                if (selectedUser?.defaultLocationId) {
                    const defaultLocation = LocationsService.getLocationFromStorageById(selectedUser?.defaultLocationId);
                    if (defaultLocation) {
                        dispatch(locationActions.setLocation(defaultLocation));
                    }
                } else {
                    dispatch(locationActions.resetLocation());
                }
                dispatch(success(selectedUser));
                dispatch(userProfileView.changeUserProfileView(profileView.userProfileInfo));
            },
            error => {
                dispatch(failure(error));
            }
        );
    };

    function request() {
        return { type: userActionTypes.CHANGE_USER_REQUESTS };
    }
    function success(currentUser) {
        return { type: userActionTypes.CHANGE_USER_SUCCESS, currentUser };
    }
    function failure(error) {
        return { type: userActionTypes.CHANGE_USER_FAILURE, error };
    }
}

function updateCurrentUser(updatedUserData) {
    return async dispatch => {
        dispatch(request());
        try {
            const updatedUser = await UserService.updateCurrentUser(updatedUserData);
            if (updatedUser) {
                dispatch(success(updatedUser));
                dispatch(userProfileView.changeUserProfileView(profileView.userProfileInfo));
                dispatch(modalActions.openProfileModal());
            } else {
                dispatch(failure());
            }
        } catch (error) {
            dispatch(failure());
            console.error("============================");
            console.error("updateCurrentUser action error: ", error);
            console.error("============================");
        }
    };

    function request() {
        return { type: userActionTypes.UPDATE_CURRENT_USER_REQUEST };
    }
    function success(currentUser) {
        return { type: userActionTypes.UPDATE_CURRENT_USER_SUCCESS, currentUser };
    }
    function failure(error) {
        return { type: userActionTypes.UPDATE_CURRENT_USER_FAILURE, error };
    }
}

function getRelatedPersons() {
    return dispatch => {
        dispatch(request());
        UserService.getRelatedPersons().then(
            relatedUsers => {
                dispatch(success(relatedUsers));
            },
            () => {
                dispatch(failure());
            }
        );
    };

    function request() {
        return { type: userActionTypes.GET_RELATED_REQUESTS };
    }
    function success(relatedUsers) {
        return { type: userActionTypes.GET_RELATED_SUCCESS, relatedUsers };
    }
    function failure(error) {
        return { type: userActionTypes.GET_RELATED_FAILURE, error };
    }
}

function createRelatedPerson(newUserData) {
    return dispatch => {
        dispatch(request());
        UserService.createRelatedPerson(newUserData).then(
            newPerson => {
                dispatch(success(newPerson));
                dispatch(userProfileView.changeUserProfileView(profileView.userProfileSwitch));
                dispatch(modalActions.openProfileModal());
            },
            () => {
                dispatch(failure());
            }
        );
    };

    function request() {
        return { type: userActionTypes.CREATE_NEW_USER_REQUESTS };
    }
    function success(newPerson) {
        return { type: userActionTypes.CREATE_NEW_USER_SUCCESS, newPerson };
    }
    function failure(error) {
        return { type: userActionTypes.CREATE_NEW_USER_FAILURE, error };
    }
}

function mergeProfiles(mergeProfilesData) {
    return async (dispatch, getState) => {
        await UserService.mergeProfiles(mergeProfilesData)
            .then(mergedProfile => {
                dispatch(userActions.getUserData());
            })
            .catch(error => {
                console.error("============================");
                console.error("mergeProfiles action error: ", error);
                console.error("============================");
            });
    };
}

function updatePerson(updatedPersonData, cb) {
    return (dispatch, getState) => {
        const currentUserId = getState().currentUser.profileId;
        const currentLocation = getState().location;
        dispatch(request());
        UserService.updateRelatedPerson(updatedPersonData)
            .then(updatedPerson => {
                if (currentUserId === updatedPerson.profileId) {
                    dispatch(updateCurrentUserData(updatedPerson));
                    if (updatedPerson.defaultLocationId && currentLocation?.id !== updatedPerson.defaultLocationId) {
                        const defaultLocation = LocationsService.getLocationFromStorageById(updatedPerson.defaultLocationId);
                        dispatch(locationActions.setLocation(defaultLocation));
                    }
                }
                dispatch(success(updatedPerson));
                cb("save_success");
            })
            .catch(error => {
                console.error("Something went wrong when updating person: ", error);
                dispatch(failure(error));
                cb("save_failure");
            });
    };

    function request() {
        return { type: userActionTypes.UPDATE_RELATED_PERSON_REQUEST };
    }

    function success(updatedPerson) {
        return { type: userActionTypes.UPDATE_RELATED_PERSON_SUCCESS, updatedPerson };
    }

    function failure(error) {
        return { type: userActionTypes.UPDATE_RELATED_PERSON_FAILURE, error };
    }

    function updateCurrentUserData(updatedPerson) {
        return { type: userActionTypes.UPDATE_CURRENT_USER_LOCAL_DATA, updatedPerson };
    }
}

function deleteUserPerson(personId) {
    return dispatch => {
        // dispatch(request());
        UserService.deleteUserPerson(personId).then(response => {
            dispatch(getRelatedPersons());
        });
    };

    // function request() { return { type: userActionTypes.UPDATE_CURRENT_USER_REQUEST } }
    // function success(currentUser) { return { type: userActionTypes.UPDATE_CURRENT_USER_SUCCESS, currentUser } }
    // function failure(error) { return { type: userActionTypes.UPDATE_CURRENT_USER_FAILURE, error } }
}

function archivedPerson(personId) {
    return dispatch => {
        dispatch(request());
        UserService.archivatePerson(personId)
            .then(updatedPerson => {
                dispatch(success(updatedPerson));
                dispatch(userActions.getUserData());
            })
            .catch(error => {
                dispatch(failure(error));
            });
    };

    function request() {
        return { type: userActionTypes.ARCHIVATE_RELATED_PERSON_REQUEST };
    }

    function success(updatedPerson) {
        return { type: userActionTypes.ARCHIVATE_RELATED_PERSON_SUCCESS, updatedPerson };
    }

    function failure(error) {
        return { type: userActionTypes.ARCHIVATE_RELATED_PERSON_FAILURE, error };
    }
}

function setMainPerson(personId) {
    return dispatch => {
        dispatch(request());
        UserService.setMainPerson(personId)
            .then(user => {
                dispatch(changeUser({
                    archived: user.Archived,
                    birthDate: user.BirthDate,
                    email: user.Email,
                    firstName: user.FirstName,
                    lastName: user.LastName,
                    middleName: user.MiddleName,
                    fullName: `${user.LastName} ${user.FirstName} ${user.MiddleName}`,
                    gender: user.Gender,
                    personId: user.PersonId,
                    phone: user.Phone,
                    profileId: user.ProfileId,
                    defaultLocationId: user.DefaultLocation,
                    orders: user.Orders,
                    orderCount: user.OrdersCount,
                    //lastOrderDate: null,
                    isMerged: user.isMerged,
                    mergedPersons: user.MergedPersons
                }))
            })
            .catch(error => {
                dispatch(failure(error));
            });
    };

    function request() {
        return { type: userActionTypes.ARCHIVATE_RELATED_PERSON_REQUEST };
    }

    function success(updatedPerson) {
        return { type: userActionTypes.ARCHIVATE_RELATED_PERSON_SUCCESS, updatedPerson };
    }

    function failure(error) {
        return { type: userActionTypes.ARCHIVATE_RELATED_PERSON_FAILURE, error };
    }
}

function logout(isSeverLogOut = false) {
    return async dispatch => {
        dispatch(request());
        await signOut({ redirect: !isSeverLogOut });
    };
    function request() {
        return { type: userActionTypes.LOGOUT };
    }
}

function restoreUserPerson(personIds) {
    return dispatch => {
        UserService.restoreUserPerson(personIds).then(response => {
            dispatch(userActions.getUserData());
        });
    };
}

function clearUserArchive() {
    return dispatch => {
        UserService.clearUserArchive().then(response => {
            dispatch(getRelatedPersons());
        });
    };
}

function deleteClient() {
    return async (dispatch, getState) => {
        try {
            const state = getState();
            const {
                jwt,
                userPhones: { mainPhone }
            } = state;
            const { res } = await UserService.deleteClient(mainPhone, jwt);
            res === "ok" && dispatch(logout());
        } catch (error) {
            console.error("===================================");
            console.error("deleteClient action error ", error);
            console.error("===================================");
        }
    };
}


function getCurrentUser(){
    return async () => {
        try {
            return await UserService.getCurrentUser();
        } catch (error) {
            console.error("===================================");
            console.error("getUserDataReturn action error ", error);
            console.error("===================================");
        }
    }
}