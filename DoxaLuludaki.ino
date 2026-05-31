#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <time.h>

// /*Marco wifi credential*/
// #define WIFI_SSID "MP"
// #define WIFI_PASSWORD "Marco1998"

/*Doxa's wifi credential*/
#define WIFI_SSID "Vodafone-C1D2"
#define WIFI_PASSWORD "b7M8ReHghtPJNQaa"


/* Firebase */
#define API_KEY "AIzaSyAPLBQZC1DkzZspa4S6EYKfuV_ZaclQvyw"
#define DATABASE_URL "https://doxaluludaki-default-rtdb.europe-west1.firebasedatabase.app/" 
#define USER_EMAIL "marcopezzano.mp@libero.it"
#define USER_PASSWORD "Doxula"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

//NTP initialization
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 3600;      // UTC+1 (Cechia)
const int daylightOffset_sec = 3600;  // ora legale

/* initialize refresh of getting settings data*/
unsigned long prevInterval = 0;
const unsigned long interval = 10000; // 5 minuti (in ms)

unsigned long lastSend = 0;
unsigned long intervalSend = 300000; //initialize to 5 min
unsigned long lastTake = 0;
unsigned long intervalTake = 300000; //initialize to 5 min

unsigned long pumpTimer = 6000; //6 seconds


/* function for printing time (log)*/
String getTimestamp() {
  time_t now;
  struct tm timeinfo;

  // Ottieni ora corrente da ESP/NTP
  time(&now);
  localtime_r(&now, &timeinfo);

  // Formatta la data leggibile per Firebase: YYYY-MM-DD_HH-MM
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%d_%H-%M", &timeinfo);

  return String(buffer);
}

/* pin initialization*/
const int pump = 9;
const int floater = 10;
const int probe = 0;


void setup() {
  Serial.begin(9600);
  pinMode(floater, INPUT_PULLUP);
  pinMode(pump, OUTPUT);
  pinMode(probe, INPUT);

  digitalWrite(pump, HIGH);

  /*wifi connection*/
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED)
  {
    Serial.print(".");
    delay(500);
  }
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());
  Serial.println();

 // NTP
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("Sincronizzazione orario...");
  while (time(nullptr) < 100000) { // aspetta NTP
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nOrario sincronizzato");

  /* log in to firebase*/
  config.api_key = API_KEY;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.database_url = DATABASE_URL;

  Firebase.reconnectNetwork(true);
    // Since v4.4.x, BearSSL engine was used, the SSL buffer need to be set.
    // Large data transmission may require larger RX buffer, otherwise connection issue or data read time out can be occurred.
  fbdo.setBSSLBufferSize(4096 /* Rx buffer size in bytes from 512 - 16384 */, 1024 /* Tx buffer size in bytes from 512 - 16384 */);

    // Limit the size of response payload to be collected in FirebaseData
  fbdo.setResponseSize(2048);

  Firebase.begin(&config, &auth);

  Firebase.setDoubleDigits(5);

  config.timeout.serverResponse = 10 * 1000;

}


void loop() {
  
  /*Get the settings interval for Send/Get data to/from database every 5 minutes (interval is hardcoded)*/
  if (Firebase.ready() && (millis() - prevInterval > interval || prevInterval == 0)) {
    prevInterval = millis();
    
    /*get the intervalSend and save it*/
    if (Firebase.RTDB.getInt(&fbdo, "settings/intervalSend")){
      intervalSend = fbdo.intData();
      Serial.println("intervallo Send set to: " + String(intervalSend));
    } else {
      Serial.println(fbdo.errorReason().c_str());
    }

    /*get the intervalTake and save it*/
    if (Firebase.RTDB.getInt(&fbdo, "settings/intervalTake")){
      intervalTake = fbdo.intData();
      Serial.println("intervallo Take set to: " + String(intervalTake));
    } else {
      Serial.println(fbdo.errorReason().c_str());
    }

    /*get the pumpTimer and save it*/
    if (Firebase.RTDB.getInt(&fbdo, "settings/pumpTimer")){
      pumpTimer = fbdo.intData();
      Serial.println("Timer pump set to: " + String(pumpTimer));
    } else {
      Serial.println(fbdo.errorReason().c_str());
    }
  }

  
  /*send data TO the database every interval time*/
  if (Firebase.ready() && (millis() - lastSend > intervalSend || lastSend == 0)) {
    lastSend = millis();

    String timestamp = getTimestamp();
    int livello = digitalRead(floater);
    
    int moist = analogRead(probe);
    
    if (Firebase.RTDB.setInt(&fbdo, "sensori/moisture/" + String(timestamp), moist)) {
      Serial.println("Moisture Sensor: " + String(moist));
    } else {
      Serial.println(fbdo.errorReason());
    }
    
    if (Firebase.RTDB.setInt(&fbdo, "stati/livello/", livello)) {
        Serial.println("livello acqua: " + String(livello));
      } else {
        Serial.println(fbdo.errorReason());
      }

  }
    
  /*get data FROM the database every interval time*/
  if (Firebase.ready() && (millis() - lastTake > intervalTake || lastTake == 0)) {
    lastTake = millis();

    /*If after intervalTake, pump state is activated*/
    if (Firebase.RTDB.getInt(&fbdo, "stati/pompa")){
      int statoPompa = fbdo.intData();
      Serial.println("Stato Pompa ricevuto:"+ String(statoPompa));
      if (statoPompa == 0){
        Serial.println("pompa è spenta ma sono nell'if");
        digitalWrite(pump, statoPompa);
        delay(pumpTimer);
        statoPompa = 1;
        digitalWrite(pump, statoPompa);
        if (Firebase.RTDB.setInt(&fbdo, "stati/pompa", statoPompa)) {
          Serial.println("Sent pump off change to database: " + String(statoPompa));
        } else {
        Serial.println(fbdo.errorReason());
        }
      }      
    } else {
      Serial.println(fbdo.errorReason().c_str());
    }
  }




}


