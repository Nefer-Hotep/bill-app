/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import { screen, waitFor, within } from "@testing-library/dom"
import userEvent from '@testing-library/user-event';
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH} from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";

// Import the data of the mockStore
import mockStore from '../__mocks__/store';
import router from "../app/Router.js";
import Bills from '../containers/Bills.js';

// Telling Jest to replace the store module from the app directory 
// with mockStore whenever store is imported in the code under test.
jest.mock('../app/store', () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    // I make sure here that my test setup is created before each test to avoid test redundancy.
    beforeEach(() => {
        //  Using `jest.spyOn` to create a mock of the 'bills' method of the 'mockStore'.
        //  By spying on this method, any tests can assert whether the method was called,
        //  how many times, and with which arguments.
        jest.spyOn(mockStore, 'bills');
        // Mock the window's `localStorage` object. This is done to isolate the test environment
        // and not make actual changes to the browser's localStorage.
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
        });
        // Set an item in the mocked localStorage.
        // This simulates having user data stored before running the test.
        localStorage.setItem(
            'user',
            JSON.stringify({
                type: 'Employee',
                email: 'a@a',
            })
        );
        // Create a new 'div' element that represents the root element for our application or component.
        const root = document.createElement('div');
        root.setAttribute('id', 'root'); // Assign an ID of 'root' to the div.
        document.body.append(root); // Append this div to the body of the document.
        // Call the `router` function to initializes or starts routing.
        router();
    });

    test("Then bill icon in vertical layout should be highlighted", async () => {
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      //to-do write expect expression
      expect(windowIcon).toHaveClass('active-icon');
    })

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
    
    test('fetches bills from mock API GET', async () => {
        // Use the `onNavigate` function to navigate to the Bills route.
        window.onNavigate(ROUTES_PATH.Bills);

        // Get the table body element by its data-testid attribute.
        // This allows for selecting specific elements in tests without relying on their visual presentation.
        const billsTableRows = screen.getByTestId('tbody');

        // I check the simulated data
        let resultToFind = await mockStore.bills().list();
        // And take it's length
        resultToFind = resultToFind.length;

        // Check if the table body has exactly 4 rows.
        // This tests if the Bills page correctly fetched and displayed 4 bills from the mock API.
        expect(within(billsTableRows).getAllByRole('row')).toHaveLength(
            resultToFind
        );

        // Wait for an element containing the text 'En attente' to appear in the DOM.
        await waitFor(() => screen.getByText('En attente'));

        // Once the above text is found, confirm its presence by getting the element and checking if it's truthy.
        const contentPending = screen.getByText('En attente');
        expect(contentPending).toBeTruthy();
    })
    
    describe('When an error occurs on API', () => {
        test('fetches bills from an API and fails with 404 message error', async () => {
            // Mock the error to return a 404.
            mockStore.bills.mockImplementationOnce(() => {
                return {
                    list: () => {
                        return Promise.reject(new Error('Erreur 404'));
                    },
                };
            });
            window.onNavigate(ROUTES_PATH.Bills);
            await new Promise(process.nextTick);
            const message = screen.getByText(/Erreur 404/);
            expect(message).toBeTruthy();
        });

        test('fetches messages from an API and fails with 500 message error', async () => {
            // Mock the error to return a 500.
            mockStore.bills.mockImplementationOnce(() => {
                return {
                    list: () => {
                        return Promise.reject(new Error('Erreur 500'));
                    },
                };
            });

            window.onNavigate(ROUTES_PATH.Bills);
            await new Promise(process.nextTick);
            const message = screen.getByText(/Erreur 500/);
            expect(message).toBeTruthy();
        });
    });

    describe('When I click on one eye icon', () => {
        it('should open a modal', () => {
            // Initialize the Bills class to test it.
            const billsPage = new Bills({
                document,
                onNavigate,
                store: mockStore,
                localStorage: window.localStorage,
            });

            const iconEyes = screen.getAllByTestId('icon-eye');

            const handleClickIconEye = jest.fn(billsPage.handleClickIconEye);

            // Mocking modal show behavior using jquery
            const modale = $.fn.modal = jest.fn();

            // Loop the iconEyes Id and add a click event, then check if function have been called
            // and if the modal have been called with the class "show"
            iconEyes.forEach((iconEye) => {
                iconEye.addEventListener('click', () =>
                    handleClickIconEye(iconEye)
                );
                userEvent.click(iconEye);

                expect(handleClickIconEye).toHaveBeenCalled();
                expect(modale).toHaveBeenCalledWith('show');
            });
        });
    });
  })
})
