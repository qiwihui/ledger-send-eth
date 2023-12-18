import { useEffect, useState } from "react";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import Eth from "@ledgerhq/hw-app-eth";
import { ethers } from "ethers";
import "./App.css";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import { RPC_URL } from "./config";

function App() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const chainId = 1;
  const [gasPrice, setGasPrice] = useState("0");
  const [addressWallet, setAddressWallet] = useState("");
  const [recipient, setRecipient] = useState("");
  const [value, setValue] = useState("0");
  const [gasLimit, setGasLimit] = useState(21000);
  const [nonce, setNonce] = useState(0);
  const [txHash, setTxHash] = useState("");
  const [accountIndex, setAccountIndex] = useState(0);
  const [eth, setEth] = useState();
  const [transport, setTransport] = useState();
  let _eth;
  const [accounts, setAccounts] = useState([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  useEffect(() => {
    const fetchData = async () => {
      let _gasPrice = (await provider.getGasPrice())._hex;
      _gasPrice = parseInt(
        (parseInt(_gasPrice, 16) * 1.15) / 1000000000
      ).toString();
      setGasPrice(_gasPrice);
    };

    fetchData().catch(console.error);
  }, []);

  async function connectLedger() {
    try {
      if (!transport) {
        const _transport = await TransportWebHID.create();
        setTransport(_transport);
        _eth = new Eth(_transport);
        setEth(_eth);
      } else {
        _eth = new Eth(transport);
        setEth(_eth);
      }
    } catch (e) {
      setMessage(e.message);
      return;
    }
    handleShow();
    await getAccounts();
  }

  async function getAccounts() {
    try {
      let _accounts = [
        {
          index: 0,
          address: (await _eth.getAddress("44'/60'/0'/0/0", false)).address,
        },
        {
          index: 1,
          address: (await _eth.getAddress("44'/60'/0'/0/1", false)).address,
        },
        {
          index: 2,
          address: (await _eth.getAddress("44'/60'/0'/0/2", false)).address,
        },
        {
          index: 3,
          address: (await _eth.getAddress("44'/60'/0'/0/3", false)).address,
        },
        {
          index: 4,
          address: (await _eth.getAddress("44'/60'/0'/0/4", false)).address,
        },
      ];
      setAccounts(_accounts);
      setLoading(false);
    } catch (e) {
      console.log(e);
      setMessage(e.message);
      handleClose();
      return;
    }
  }

  function saveSelection(e) {
    setAccountIndex(e.target.value);
  }

  async function selectAccount() {
    setAddressWallet(accounts[accountIndex].address);
    handleClose();
  }

  useEffect(() => {
    const fetchData = async () => {
      let _nonce = await provider.getTransactionCount(addressWallet, "latest");
      setNonce(_nonce);
    };

    fetchData().catch(console.error);
  }, [addressWallet]);

  async function sendTransaction() {
    setCreating(true);
    //Building transaction with the information gathered
    const transaction = {
      to: recipient,
      gasPrice: ethers.utils.hexlify(ethers.utils.parseUnits(gasPrice, "gwei")),
      gasLimit: ethers.utils.hexlify(gasLimit),
      nonce: nonce,
      chainId: chainId,
      value: ethers.utils.hexlify(ethers.utils.parseEther(value)),
    };
    console.log(transaction);

    //Serializing the transaction to pass it to Ledger Nano for signing
    let unsignedTx = ethers.utils
      .serializeTransaction(transaction)
      .substring(2);

    //Sign with the Ledger Nano (Sign what you see)
    try {
      const signature = await eth.signTransaction(
        "44'/60'/0'/0/" + accountIndex,
        unsignedTx
      );
      //Parse the signature
      console.log(signature);
      signature.r = "0x" + signature.r;
      signature.s = "0x" + signature.s;
      signature.v = parseInt(signature.v);
      signature.from = addressWallet;

      //Serialize the same transaction as before, but adding the signature on it
      let signedTx = ethers.utils.serializeTransaction(transaction, signature);
      console.log(signedTx);
      let response = await provider.sendTransaction(signedTx);
      console.log(response);
      setTxHash("https://etherscan.io/tx/" + response.hash);
    } catch (e) {
      setMessage(e.message);
      setCreating(false);
    }
    setCreating(false);
    setMessage("");
  }

  return (
    <div className="m-3 mt-5">
      <div className="d-flex flex-column justify-content-center m-3 align-items-center w-100">
        <p>Click on the bellow button to connect your Ledger Wallet</p>
        <button
          className="btn btn-primary w-25"
          style={{ minWidth: "185px" }}
          onClick={(addressWallet == "" && connectLedger) || handleShow}
        >
          {(addressWallet == "" && "Connect your Ledger") ||
            "Select an account"}
        </button>
      </div>
      <div className="d-flex flex-column justify-content-center m-3 align-items-center">
        <div id="app" className="w-50" style={{ minWidth: "300px" }}>
          <form className="row g-3">
            <div className="col-md-12">
              <label for="wallet" className="form-label">
                Wallet Address
              </label>
              <input
                type="text"
                className="form-control"
                id="wallet"
                value={addressWallet}
                disabled
              />
            </div>
            <div className="col-md-12">
              <label for="recipient" className="form-label">
                Recipient
              </label>
              <input
                type="text"
                className="form-control"
                id="recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label for="gasPrice" className="form-label">
                Gas Price (gwei)
              </label>
              <input
                type="text"
                className="form-control"
                id="gasPrice"
                value={gasPrice}
                onChange={(e) => setGasPrice(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label for="gasLimit" className="form-label">
                Gas Limit (wei)
              </label>
              <input
                type="number"
                className="form-control"
                id="gasLimit"
                value={gasLimit}
                disabled
              />
            </div>
            <div className="col-md-6">
              <label for="chainId" className="form-label">
                Nonce
              </label>
              <input
                type="number"
                className="form-control"
                id="chainId"
                value={nonce}
                onChange={(e) => setNonce(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label for="value" className="form-label">
                Value (ETH)
              </label>
              <input
                type="text"
                className="form-control"
                id="value"
                value={value}
                onChange={(e) => setValue(e.target.value.toString())}
              />
            </div>
            <div className="col-md-6 mt-4">
              <button
                type="button"
                id="tx-transfer"
                className="btn btn-primary tx-btn"
                onClick={sendTransaction}
              >
                {(creating && (
                  <Spinner
                    animation="grow"
                    role="status"
                    variant="info"
                    size="sm"
                  ></Spinner>
                )) || <span>Create Transaction</span>}
              </button>
            </div>
            <div className="col-md-12 text-danger">{message}</div>
            {txHash && (
              <div className="d-flex flex-column justify-content-center mt-5 align-items-start">
                <p className="url">Mainnet etherscan:</p>
                <a id="url" href={txHash} target="_blank">
                  {txHash}
                </a>
              </div>
            )}
          </form>
        </div>
      </div>
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Select an account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {(loading && (
            <div className="d-flex flex-row justify-content-start align-items-center">
              <Spinner animation="grow" role="status" variant="info"></Spinner>
              <span className="pl-5">Fetch accounts...</span>
            </div>
          )) || (
            <div className="d-flex flex-column justify-content-start">
              {accounts.map((account, i) => (
                <label>
                  <input
                    type="radio"
                    key={i}
                    name={account.index}
                    value={account.index}
                    checked={accountIndex == account.index}
                    onClick={saveSelection}
                  />
                  &nbsp;
                  {account.address}
                </label>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {/* <Button variant="secondary" onClick={handleClose}>
            Close
          </Button> */}
          <Button variant="primary" onClick={selectAccount}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default App;
