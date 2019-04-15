import java.math.BigInteger;

/**
 * This class models the Node entity, which is represented by an identifier (m
 * bits long), an IP address and a UDP port on which it is listening for
 * messages.
 * Strings are used instead of InetAddresses in order to avoid the Unknown host exception
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
	 * @param id
	 * @param address
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
	 * Logical equality between elements
	 * @param n the node to confront with this one
	 * @return true if they are equals, false otherwise
	 */
	public boolean equals(Node n) {
		return this.identifier == n.getId();
	}


	public String getIpAddress() {
		return ipAddress;
	}


	public int getUdpPort() {
		return udpPort;
	}

}
