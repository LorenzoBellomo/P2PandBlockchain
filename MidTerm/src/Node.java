import java.math.BigInteger;

/**
 * This class models the Node entity, which is represented by an identifier (m
 * bits long BigInteger), an IP address and a UDP port on which it is listening for
 * messages.
 * Strings are used instead of InetAddresses in order to avoid the UnknownHostException
 * 
 * @author Lorenzo Bellomo
 *
 */
public class Node {

	/* Instance Variables*/
	
	private BigInteger identifier;
	private String ipAddress;
	private int udpPort;
	
	/* Constructors */

	/**
	 * Constructor
	 * @param id the integer identifier
	 * @param address the IP address string
	 */
	public Node(BigInteger id, String address) {
		ipAddress = address;
		identifier = id;
		udpPort = 0;
	}


	/* Getter and setter methods */
	
	/**
	 * Getter method for the Identifier Field
	 * @return the id of the Node
	 */
	public BigInteger getId() {
		return identifier;
	}

	/* Generic methods */
	
	/**
	 * Mock ping that simulates an Always on network with no churn
	 * @return always true
	 */
	public boolean ping() {
		return true;
	}
	
	/**
	 * Logical equality between elements, it just checks for the identifier, assuming
	 * there are no collisions
	 * @param n the node to confront with this one
	 * @return true if they are equals, false otherwise
	 */
	public boolean equals(Node n) {
		return this.identifier == n.getId();
	}

	/**
	 * Getter method for the IP Address string
	 * @return the ip address of the node
	 */
	public String getIpAddress() {
		return ipAddress;
	}

	/**
	 * Getter method for the UDP port of the node
	 * @return the UDP port where the node is listening for messages
	 */
	public int getUdpPort() {
		return udpPort;
	}

}
